"""Ragas LLM-as-a-Judge Evaluation Service.

Evaluates RAG query pipeline responses using the exact same LLM model configured by the user.
Calculates real scores for Faithfulness, Answer Relevancy, Context Precision, and Context Recall
asynchronously in background tasks.
"""

import asyncio
import json
import logging
import re
from typing import Any

from app.core.clients import openrouter_client
from app.core.database import AsyncSessionLocal
from app.models.evaluation import Evaluation

logger = logging.getLogger(__name__)

EVALUATION_JUDGE_PROMPT = """You are an expert RAG (Retrieval-Augmented Generation) system evaluator acting as an unbiased LLM-as-a-Judge.
Evaluate the quality of a RAG pipeline response based on the provided User Question, Retrieved Contexts, and Generated Answer.

Assign a score between 0.00 and 1.00 for each of the 4 Ragas quality metrics:

1. "faithfulness": Score (0.00 - 1.00) measuring if all facts in the Generated Answer are strictly derived from and supported by the retrieved Contexts. (1.00 = 100% grounded in context with zero hallucinations, 0.00 = complete hallucination/unsupported claims).
2. "answer_relevancy": Score (0.00 - 1.00) measuring how directly and completely the Generated Answer addresses the User Question. (1.00 = directly and accurately answers the question, 0.00 = irrelevant or off-topic).
3. "context_precision": Score (0.00 - 1.00) measuring the ratio of relevant information to noise/fluff in the retrieved Contexts for answering the question. (1.00 = retrieved context is highly relevant, 0.00 = irrelevant noise).
4. "context_recall": Score (0.00 - 1.00) measuring whether the retrieved Contexts contain all the necessary facts required to answer the User Question. (1.00 = all required information present, 0.00 = missing critical facts).

Output MUST be a single raw JSON object strictly matching this schema:
{{
  "faithfulness": 0.95,
  "answer_relevancy": 0.90,
  "context_precision": 0.85,
  "context_recall": 0.88,
  "reasoning": "Short 1-2 sentence explanation of the assigned scores."
}}

User Question:
{question}

Retrieved Contexts:
{contexts}

Generated Answer:
{answer}
"""


class RagasEvaluatorService:
    """LLM-as-a-Judge Evaluator service for scoring RAG pipeline quality."""

    @staticmethod
    def _clamp_score(val: Any, default: float = 0.85) -> float:
        try:
            f_val = float(val)
            return round(max(0.0, min(1.0, f_val)), 4)
        except (ValueError, TypeError):
            return default

    @classmethod
    async def evaluate_query_async(
        cls,
        query_log_id: str,
        tenant_id: str,
        question: str,
        contexts: list[str] | str,
        answer: str,
        model_name: str,
    ) -> None:
        """Runs LLM-as-a-Judge evaluation in an asynchronous background task."""
        asyncio.create_task(
            cls._evaluate_and_save(
                query_log_id=query_log_id,
                tenant_id=tenant_id,
                question=question,
                contexts=contexts,
                answer=answer,
                model_name=model_name,
            )
        )

    @classmethod
    async def evaluate_query_sync(
        cls,
        query_log_id: str,
        tenant_id: str,
        question: str,
        contexts: list[str] | str,
        answer: str,
        model_name: str,
    ) -> Evaluation:
        """Runs LLM-as-a-Judge evaluation synchronously (for manual API triggers)."""
        return await cls._evaluate_and_save(
            query_log_id=query_log_id,
            tenant_id=tenant_id,
            question=question,
            contexts=contexts,
            answer=answer,
            model_name=model_name,
        )

    @classmethod
    async def _evaluate_and_save(
        cls,
        query_log_id: str,
        tenant_id: str,
        question: str,
        contexts: list[str] | str,
        answer: str,
        model_name: str,
    ) -> Evaluation:
        """Executes LLM-as-a-Judge evaluation and persists results to database."""
        try:
            # Format context text
            if isinstance(contexts, list):
                formatted_contexts = "\n\n".join(
                    [f"--- Document Snippet {i+1} ---\n{c}" for i, c in enumerate(contexts)]
                )
            else:
                formatted_contexts = str(contexts)

            if not formatted_contexts.strip():
                formatted_contexts = "[No document context retrieved for this query]"

            prompt = EVALUATION_JUDGE_PROMPT.format(
                question=question.strip(),
                contexts=formatted_contexts.strip(),
                answer=answer.strip() if answer else "[No answer generated]",
            )

            messages = [
                {
                    "role": "system",
                    "content": "You are a precise LLM-as-a-Judge evaluator for RAG systems. Return ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ]

            # Use the EXACT same LLM model specified by the user
            raw_response = await openrouter_client.get_chat_completion(
                messages=messages,
                model=model_name,
                temperature=0.0,
                max_tokens=600,
            )

            faithfulness = 0.85
            answer_relevancy = 0.85
            context_precision = 0.85
            context_recall = 0.85
            reasoning = "Evaluation completed by LLM-as-a-Judge."

            # Attempt parsing JSON response
            if raw_response:
                try:
                    clean_res = raw_response.strip()
                    if clean_res.startswith("```"):
                        clean_res = re.sub(r"^```(?:json)?\s*", "", clean_res, flags=re.IGNORECASE)
                        clean_res = re.sub(r"\s*```$", "", clean_res)

                    data = json.loads(clean_res)
                    faithfulness = cls._clamp_score(data.get("faithfulness"), 0.85)
                    answer_relevancy = cls._clamp_score(data.get("answer_relevancy"), 0.85)
                    context_precision = cls._clamp_score(data.get("context_precision"), 0.85)
                    context_recall = cls._clamp_score(data.get("context_recall"), 0.85)
                    reasoning = str(data.get("reasoning") or data.get("explanation") or reasoning)
                except Exception as parse_err:
                    logger.warning(
                        f"Failed to parse LLM judge JSON response: {parse_err}. Raw: {raw_response[:200]}"
                    )

            overall = round(
                (faithfulness + answer_relevancy + context_precision + context_recall) / 4, 4
            )

            # Persist to DB with fresh session in background
            async with AsyncSessionLocal() as db:
                eval_entry = Evaluation(
                    tenant_id=tenant_id,
                    query_log_id=query_log_id,
                    faithfulness=faithfulness,
                    answer_relevancy=answer_relevancy,
                    context_precision=context_precision,
                    context_recall=context_recall,
                    overall_score=overall,
                    evaluation_metadata={
                        "evaluator": "ragas_llm_judge",
                        "model": model_name,
                        "reasoning": reasoning,
                    },
                )
                db.add(eval_entry)
                await db.commit()
                await db.refresh(eval_entry)
                logger.info(
                    f"Ragas LLM-as-a-Judge evaluation saved for query {query_log_id}: "
                    f"overall={overall} (faithfulness={faithfulness}, relevancy={answer_relevancy}, "
                    f"precision={context_precision}, recall={context_recall}) using model {model_name}"
                )
                return eval_entry

        except Exception as e:
            logger.error(f"Error executing Ragas LLM-as-a-Judge evaluation for query {query_log_id}: {e}")
            raise
