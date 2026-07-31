import json
import logging
import re
import time
from collections.abc import AsyncGenerator
from decimal import Decimal

from llama_index.core.schema import NodeWithScore, TextNode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clients import openrouter_client
from app.core.exceptions import BadRequestError
from app.core.logger import QueryLogger
from app.core.prompts import format_intent_messages, format_rag_prompt
from app.models.auth import User
from app.models.query_log import QueryLog
from app.models.tenant_settings import TenantSettings
from app.repositories.document import DocumentRepository
from app.schemas.query import QueryRequest, QueryResponse, SourceCitation
from app.services.evaluator import RagasEvaluatorService

logger = logging.getLogger(__name__)


class QueryService:
    """Service handling RAG vector search via LlamaIndex nodes, prompt assembly, and LLM streaming/completion."""

    def __init__(self, doc_repo: DocumentRepository):
        self.doc_repo = doc_repo

    async def _get_tenant_settings(
        self, db: AsyncSession, tenant_id: str | None
    ) -> TenantSettings | None:
        if not tenant_id:
            return None
        res = await db.execute(select(TenantSettings).where(TenantSettings.tenant_id == tenant_id))
        return res.scalar_one_or_none()

    async def _classify_intent(
        self,
        question: str,
        model_name: str,
        chat_history: list[dict] | None = None,
        db: AsyncSession | None = None,
    ) -> str:
        """Classify user prompt into 'greeting', 'out_of_scope', 'unclear', or 'knowledge_query' using LLM."""
        if not question or not question.strip():
            return "greeting"

        q_lower = question.strip().lower()

        # Fast heuristic check for pure simple greetings
        PURE_GREETINGS = {
            "hi",
            "hello",
            "halo",
            "pagi",
            "selamat pagi",
            "selamat siang",
            "selamat malam",
            "hey",
            "ping",
            "test",
            "tes",
        }
        if q_lower in PURE_GREETINGS:
            QueryLogger.log_intent_classification(question, "greeting (heuristic)", 0.0)
            return "greeting"

        # Fast heuristic check for document/work keywords -> force knowledge_query
        DOCUMENT_KEYWORDS = {
            "template",
            "dokumen",
            "file",
            "sop",
            "laporan",
            "pdf",
            "excel",
            "docx",
            "format",
            "syarat",
            "ketentuan",
            "panduan",
            "tata cara",
            "prosedur",
            "draft",
            "formulir",
        }
        if any(kw in q_lower for kw in DOCUMENT_KEYWORDS):
            QueryLogger.log_intent_classification(question, "knowledge_query (heuristic)", 0.0)
            return "knowledge_query"

        intent_start = time.perf_counter()
        classification_messages = await format_intent_messages(
            question, chat_history=chat_history, db=db
        )

        try:
            raw_response = []
            async for item_type, item_data in openrouter_client.stream_chat_completion(
                classification_messages,
                model=model_name,
                temperature=0.0,
                max_tokens=40,
            ):
                if item_type == "token":
                    raw_response.append(item_data)

            res_text = "".join(raw_response).strip()
            intent = "knowledge_query"

            # 1. Try JSON parse first
            try:
                parsed = json.loads(res_text)
                if isinstance(parsed, dict) and "intent" in parsed:
                    val = str(parsed["intent"]).strip().lower()
                    if val in ("greeting", "out_of_scope", "unclear", "knowledge_query"):
                        intent = val
            except Exception:
                # 2. Fallback regex extraction for "intent": "XXX"
                match = re.search(
                    r'"intent"\s*:\s*"(greeting|out_of_scope|unclear|knowledge_query)"',
                    res_text,
                    re.IGNORECASE,
                )
                if match:
                    intent = match.group(1).lower()

            intent_ms = (time.perf_counter() - intent_start) * 1000
            QueryLogger.log_intent_classification(question, intent, intent_ms)
            return intent
        except Exception as e:
            logger.warning(f"Intent classification failed: {e}. Defaulting to knowledge_query.")
            intent_ms = (time.perf_counter() - intent_start) * 1000
            QueryLogger.log_intent_classification(question, "knowledge_query (fallback)", intent_ms)

        return "knowledge_query"

    async def execute_query(
        self, request: QueryRequest, user: User | None = None, db: AsyncSession | None = None
    ) -> QueryResponse:
        """Executes non-streaming RAG query."""
        start_time = time.time()
        settings_obj = await self._get_tenant_settings(db, user.tenant_id if user else None)
        model_name = (
            settings_obj.llm_model
            if settings_obj
            and settings_obj.llm_model
            and settings_obj.llm_model != "anthropic/claude-3.5-sonnet"
            else None
        )

        if not model_name:
            raise BadRequestError(
                "Belum ada model LLM yang dipilih. Silakan pilih model LLM terlebih dahulu pada menu Prompt & Model Settings."
            )

        history_list = (
            [m.model_dump() for m in request.chat_history] if request.chat_history else None
        )
        intent = await self._classify_intent(
            request.question, model_name, chat_history=history_list, db=db
        )

        if intent in ("greeting", "out_of_scope", "unclear"):
            context_snippets = []
            citations = []
        else:
            effective_top_k = (
                settings_obj.top_k if settings_obj and request.top_k == 4 else (request.top_k or 4)
            )
            chunks_with_meta = await self._retrieve_relevant_chunks(
                request.question, effective_top_k
            )

            llama_nodes = [
                NodeWithScore(
                    node=TextNode(
                        text=chunk.content,
                        metadata={"doc_name": doc.name, "page_number": chunk.page_number},
                    ),
                    score=score,
                )
                for chunk, doc, score in chunks_with_meta
            ]

            context_snippets = [
                {
                    "doc_name": node_obj.node.metadata.get("doc_name"),
                    "page_number": node_obj.node.metadata.get("page_number"),
                    "content": node_obj.node.get_content(),
                }
                for node_obj in llama_nodes
            ]

            citations = [
                SourceCitation(
                    document_id=doc.id,
                    document_name=doc.name,
                    page_number=chunk.page_number,
                    snippet=chunk.content[:200] + ("..." if len(chunk.content) > 200 else ""),
                    score=score,
                )
                for chunk, doc, score in chunks_with_meta
            ]

        messages = await format_rag_prompt(
            intent=intent,
            context_snippets=context_snippets,
            question=request.question,
            chat_history=history_list,
            custom_user_prompt=settings_obj.system_prompt if settings_obj else None,
            db=db,
        )

        answer_parts = []
        usage_payload = {}
        async for item_type, item_data in openrouter_client.stream_chat_completion(
            messages,
            model=model_name,
            temperature=float(settings_obj.temperature) if settings_obj else None,
            max_tokens=settings_obj.max_tokens if settings_obj else None,
        ):
            if item_type == "token":
                answer_parts.append(item_data)
            elif item_type == "usage":
                usage_payload = item_data

        answer = "".join(answer_parts)
        latency_ms = int((time.time() - start_time) * 1000)

        total_tokens = usage_payload.get("total_tokens", 0)
        QueryLogger.log_query_complete(
            question=request.question,
            intent=intent,
            model=model_name,
            total_tokens=total_tokens,
            citations_count=len(citations),
            total_ms=latency_ms,
        )

        # Log query & evaluation
        if user and db:
            await self._log_query_and_eval(
                db=db,
                tenant_id=user.tenant_id,
                user_id=user.id,
                question=request.question,
                answer=answer,
                model_name=model_name,
                usage_payload=usage_payload,
                latency_ms=latency_ms,
                top_k=request.top_k,
                sources_count=len(citations),
                intent=intent,
                context_snippets=[
                    c.get("content", "") for c in context_snippets if isinstance(c, dict)
                ],
            )

        return QueryResponse(answer=answer, sources=citations)

    async def stream_query(
        self, request: QueryRequest, user: User | None = None, db: AsyncSession | None = None
    ) -> AsyncGenerator[str, None]:
        """Streams LLM tokens followed by source citations formatted as Server-Sent Events (SSE)."""
        start_time = time.time()
        settings_obj = await self._get_tenant_settings(db, user.tenant_id if user else None)
        model_name = (
            settings_obj.llm_model
            if settings_obj
            and settings_obj.llm_model
            and settings_obj.llm_model != "anthropic/claude-3.5-sonnet"
            else None
        )

        if not model_name:
            err_msg = "Belum ada model LLM yang dipilih. Silakan pilih model LLM terlebih dahulu pada menu Prompt & Model Settings."
            yield f"data: {json.dumps({'type': 'token', 'content': err_msg})}\n\n"
            yield f"data: {json.dumps({'type': 'citations', 'sources': []})}\n\n"
            yield "data: [DONE]\n\n"
            return

        yield f"data: {json.dumps({'type': 'status', 'status': 'Analyzing intent...'})}\n\n"
        history_list = (
            [m.model_dump() for m in request.chat_history] if request.chat_history else None
        )
        intent = await self._classify_intent(
            request.question, model_name, chat_history=history_list, db=db
        )

        if intent == "greeting":
            status_text = "Thinking..."
        elif intent == "out_of_scope":
            status_text = "Formulating response..."
        elif intent == "unclear":
            status_text = "Asking for clarification..."
        else:
            status_text = "Searching documents..."

        yield f"data: {json.dumps({'type': 'status', 'status': status_text})}\n\n"

        if intent in ("greeting", "out_of_scope", "unclear"):
            context_snippets = []
            citations = []
        else:
            effective_top_k = (
                settings_obj.top_k if settings_obj and request.top_k == 4 else (request.top_k or 4)
            )
            chunks_with_meta = await self._retrieve_relevant_chunks(
                request.question, effective_top_k
            )

            llama_nodes = [
                NodeWithScore(
                    node=TextNode(
                        text=chunk.content,
                        metadata={"doc_name": doc.name, "page_number": chunk.page_number},
                    ),
                    score=score,
                )
                for chunk, doc, score in chunks_with_meta
            ]

            context_snippets = [
                {
                    "doc_name": node_obj.node.metadata.get("doc_name"),
                    "page_number": node_obj.node.metadata.get("page_number"),
                    "content": node_obj.node.get_content(),
                }
                for node_obj in llama_nodes
            ]

            citations = [
                SourceCitation(
                    document_id=doc.id,
                    document_name=doc.name,
                    page_number=chunk.page_number,
                    snippet=chunk.content[:250] + ("..." if len(chunk.content) > 250 else ""),
                    score=score,
                ).model_dump()
                for chunk, doc, score in chunks_with_meta
            ]

        messages = await format_rag_prompt(
            intent=intent,
            context_snippets=context_snippets,
            question=request.question,
            chat_history=history_list,
            custom_user_prompt=settings_obj.system_prompt if settings_obj else None,
            db=db,
        )
        full_answer_parts = []
        usage_payload = {}

        # 1. Stream token deltas & usage payload
        try:
            async for item_type, item_data in openrouter_client.stream_chat_completion(
                messages,
                model=model_name,
                temperature=float(settings_obj.temperature) if settings_obj else None,
                max_tokens=settings_obj.max_tokens if settings_obj else None,
            ):
                if item_type == "token":
                    full_answer_parts.append(item_data)
                    yield f"data: {json.dumps({'type': 'token', 'content': item_data})}\n\n"
                elif item_type == "usage":
                    usage_payload = item_data
        except Exception as err:
            logger.error(f"Error during LLM streaming: {err}")
            err_text = f"\n\n[Error generating completion: {err!s}]"
            full_answer_parts.append(err_text)
            yield f"data: {json.dumps({'type': 'token', 'content': err_text})}\n\n"

        full_answer = "".join(full_answer_parts)
        latency_ms = int((time.time() - start_time) * 1000)

        total_tokens = usage_payload.get("total_tokens", 0)
        QueryLogger.log_query_complete(
            question=request.question,
            intent=intent,
            model=model_name,
            total_tokens=total_tokens,
            citations_count=len(citations),
            total_ms=latency_ms,
        )

        # 2. Log query & auto Ragas evaluation to database
        if user and db:
            await self._log_query_and_eval(
                db=db,
                tenant_id=user.tenant_id,
                user_id=user.id,
                question=request.question,
                answer=full_answer,
                model_name=model_name,
                usage_payload=usage_payload,
                latency_ms=latency_ms,
                top_k=request.top_k,
                sources_count=len(citations),
                intent=intent,
                context_snippets=[
                    c.get("content", "") for c in context_snippets if isinstance(c, dict)
                ],
            )

        # 3. Send source citations event
        yield f"data: {json.dumps({'type': 'citations', 'sources': citations})}\n\n"
        yield "data: [DONE]\n\n"

    async def _log_query_and_eval(
        self,
        db: AsyncSession,
        tenant_id: str,
        user_id: str,
        question: str,
        answer: str,
        model_name: str,
        usage_payload: dict,
        latency_ms: int,
        top_k: int,
        sources_count: int,
        intent: str = "knowledge_query",
        context_snippets: list[str] | None = None,
    ):
        try:
            prompt_tokens = usage_payload.get("prompt_tokens") or ((len(question) // 4) + 350)
            completion_tokens = usage_payload.get("completion_tokens") or max(5, len(answer) // 4)
            total_tokens = usage_payload.get("total_tokens") or (prompt_tokens + completion_tokens)

            # Dynamic cost calculation based on usage tokens
            estimated_cost = round(
                Decimal(str((prompt_tokens * 0.000003) + (completion_tokens * 0.000015))), 6
            )

            q_log = QueryLog(
                tenant_id=tenant_id,
                user_id=user_id,
                question=question,
                answer=answer,
                model_name=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost=estimated_cost,
                latency_ms=latency_ms,
                top_k=top_k,
                intent=intent,
                sources_count=sources_count,
            )
            db.add(q_log)
            await db.commit()

            # Trigger real asynchronous evaluation in background
            await RagasEvaluatorService.evaluate_query_async(
                query_log_id=q_log.id,
                tenant_id=tenant_id,
                question=question,
                contexts=context_snippets or [],
                answer=answer,
                model_name=model_name,
                intent=intent,
            )
        except Exception as e:
            logger.error(f"Failed to log query and trigger evaluation: {e}")

    async def _retrieve_relevant_chunks(self, question: str, top_k: int):
        if not question.strip():
            raise BadRequestError("Question cannot be empty.")

        embeddings = await openrouter_client.get_embeddings([question])
        if not embeddings:
            return []

        query_vec = embeddings[0]
        return await self.doc_repo.search_similar_chunks(query_vec, top_k=top_k)
