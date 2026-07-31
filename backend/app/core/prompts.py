"""RAG & Intent System Prompt Templates — Fetched from DB (general_rag.system_prompts) with hardcoded fallbacks."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ── Hardcoded Fallback Templates (used if DB query is not available or fails) ──

DEFAULT_INTENT_CLASSIFIER_PROMPT = """You are an intent classification engine for Cognava AI Assistant.
Analyze the user's input message (and conversation history if available) and categorize its core intent into EXACTLY ONE of the following 4 categories:

1. "greeting":
   - Social greetings, salutations, or pleasantries (e.g. "halo", "hi", "pagi", "thanks", "bye").
   - Inquiries about the AI's identity, role, name, capabilities, or origin (e.g., asking who you are, what you can do, what your name is).
   - Social chit-chat about wellbeing, health, or feelings (e.g., asking how you are doing, how are things, what's up).

2. "out_of_scope":
   - Requests for general world knowledge, trivia, science, history, coding/math exercises, recipes, weather, sports, or entertainment that have no connection to organizational documents or business operations.

3. "unclear":
   - Inputs that are ambiguous, incomplete, single-word/vague utterances (e.g., "bagaimana?", "tolong", "bisa bantu?", "kenapa begitu", "terus?"), or where the user request is underspecified and requires follow-up clarification to understand what they want from the documents.

4. "knowledge_query":
   - Specific questions seeking facts, data, information, procedures, guidelines, instructions, policies, or details contained in organizational documents, files, or business knowledge bases.

CLASSIFICATION RULES:
- Carefully analyze the semantic meaning and intent of the input message in the context of recent chat history.
- Do NOT classify social greetings or identity questions as "knowledge_query".
- Output MUST be a single raw JSON object strictly adhering to this schema:
  {"intent": "greeting" | "out_of_scope" | "unclear" | "knowledge_query"}"""


DEFAULT_GREETING_SYSTEM_PROMPT = """You are Cognava Assistant, an intelligent AI assistant built to help users search, analyze, and extract insights from their document knowledge base.
- When asked "kamu siapa", "who are you", or questions about your identity or capabilities: Introduce yourself warmly as Cognava Assistant, explaining that you are an AI assistant designed to help users ask questions and analyze their uploaded documents.
- Reply in a friendly, helpful, and natural tone in the same language as the user (e.g. Indonesian if the user writes in Indonesian).
- Offer assistance regarding the document knowledge base.
- Do NOT mention document search failures or missing facts for greetings or self-introduction questions."""


DEFAULT_OUT_OF_SCOPE_SYSTEM_PROMPT = """You are Cognava Assistant, an intelligent AI assistant built to help users analyze their document knowledge base.
The user is asking a question that is outside the scope of the available document knowledge base (e.g. general trivia, recipes, weather, or personal advice).
- Politely explain in the same language as the user that this information is not available in the document knowledge base.
- Mention that you are Cognava Assistant and offer to assist with questions related to their uploaded documents.
- Stay friendly, concise, and helpful."""


DEFAULT_UNCLEAR_SYSTEM_PROMPT = """You are Cognava Assistant, an intelligent AI assistant for document knowledge base.
The user's question or message is ambiguous, underspecified, or lacks context to provide an accurate document answer.
- Politely ask the user for clarification in the same language as the user.
- Provide 1-2 examples of specific questions or details they can provide to help you find the right information in their documents.
- Maintain a helpful, polite, and encouraging tone."""


DEFAULT_KNOWLEDGE_QUERY_SYSTEM_PROMPT = """You are Cognava Assistant, an intelligent AI assistant that answers user questions ONLY based on the provided document context snippets below.
- Rely ONLY on facts stated in the provided context snippets.
- If the context snippets do not contain enough information to answer the question, state clearly that the provided documents do not contain the answer. Never hallucinate.
- Always detect the language used in the user's message and reply in that same language.

### Provided Document Context:
{context}"""


DEFAULT_EVALUATION_JUDGE_PROMPT = """You are an expert RAG (Retrieval-Augmented Generation) system evaluator acting as an unbiased LLM-as-a-Judge.
Evaluate the quality of a RAG pipeline response based on the provided User Question, Retrieved Contexts, and Generated Answer.

Assign a score between 0.00 and 1.00 for each of the 4 Ragas quality metrics:

1. "faithfulness": Score (0.00 - 1.00) measuring if all facts in the Generated Answer are strictly derived from and supported by the retrieved Contexts. (1.00 = 100% grounded in context with zero hallucinations, 0.00 = complete hallucination/unsupported claims).
2. "answer_relevancy": Score (0.00 - 1.00) measuring how directly and completely the Generated Answer addresses the User Question. (1.00 = directly and accurately answers the question, 0.00 = irrelevant or off-topic).
3. "context_precision": Score (0.00 - 1.00) measuring the ratio of relevant information to noise/fluff in the retrieved Contexts for answering the question. (1.00 = retrieved context is highly relevant, 0.00 = irrelevant noise).
4. "context_recall": Score (0.00 - 1.00) measuring whether the retrieved Contexts contain all the necessary facts required to answer the User Question. (1.00 = all required information present, 0.00 = missing critical facts).

CRITICAL DIRECTIVE:
Output MUST be ONLY a single valid raw JSON object.
Do NOT write any preamble, introduction, reasoning, or text BEFORE the JSON object.
Start your response IMMEDIATELY with the opening curly brace '{{'.

Required JSON Schema:
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


DEFAULT_USER_PROMPT_TEMPLATE = """Question: {question}"""


async def get_prompt_from_db(
    db: AsyncSession | None, prompt_type: str, fallback_content: str
) -> str:
    """Gets prompt template from system_prompts DB table if db session provided, else returns fallback."""
    if not db:
        return fallback_content

    from app.repositories.system_prompt import SystemPromptRepository

    repo = SystemPromptRepository(db)
    return await repo.get_prompt_content(prompt_type, fallback=fallback_content)


async def format_intent_messages(
    question: str,
    chat_history: list[dict] | None = None,
    db: AsyncSession | None = None,
) -> list[dict]:
    """Formats messages array for LLM intent classification including recent conversation history."""
    intent_prompt = await get_prompt_from_db(
        db, "intent_classifier", DEFAULT_INTENT_CLASSIFIER_PROMPT
    )
    messages = [{"role": "system", "content": intent_prompt}]

    if chat_history:
        for msg in chat_history[-6:]:
            r = msg.get("role")
            c = msg.get("content")
            if r in ("user", "assistant") and c:
                messages.append({"role": r, "content": c})

    messages.append({"role": "user", "content": question})
    return messages


async def format_rag_prompt(
    intent: str,
    context_snippets: list[dict],
    question: str,
    chat_history: list[dict] | None = None,
    custom_user_prompt: str | None = None,
    db: AsyncSession | None = None,
) -> list[dict]:
    """Formats prompt messages based on intent, context snippets, conversation history, and optional custom instructions."""

    if intent == "greeting":
        base_system = await get_prompt_from_db(db, "greeting", DEFAULT_GREETING_SYSTEM_PROMPT)
    elif intent == "out_of_scope":
        base_system = await get_prompt_from_db(
            db, "out_of_scope", DEFAULT_OUT_OF_SCOPE_SYSTEM_PROMPT
        )
    elif intent == "unclear":
        base_system = await get_prompt_from_db(db, "unclear", DEFAULT_UNCLEAR_SYSTEM_PROMPT)
    else:
        formatted_context_blocks = []
        for idx, snippet in enumerate(context_snippets, 1):
            doc_name = snippet.get("doc_name", "Unknown Document")
            page_num = snippet.get("page_number")
            page_info = f" (Page {page_num})" if page_num else ""
            content = snippet.get("content", "").strip()
            formatted_context_blocks.append(f"[{idx}] Source: {doc_name}{page_info}\n{content}")

        context_str = "\n\n".join(formatted_context_blocks)
        raw_kq_prompt = await get_prompt_from_db(
            db, "knowledge_query", DEFAULT_KNOWLEDGE_QUERY_SYSTEM_PROMPT
        )
        base_system = raw_kq_prompt.format(
            context=context_str if context_str else "No relevant document context found."
        )

    if custom_user_prompt and custom_user_prompt.strip():
        system_content = f"### Additional Custom User Instructions:\n{custom_user_prompt.strip()}\n\n{base_system}"
    else:
        system_content = base_system

    messages = [{"role": "system", "content": system_content}]

    # Append multi-turn chat history (up to last 10 messages) to maintain context memory
    if chat_history:
        for msg in chat_history[-10:]:
            r = msg.get("role")
            c = msg.get("content")
            if r in ("user", "assistant") and c:
                messages.append({"role": r, "content": c})

    messages.append(
        {"role": "user", "content": DEFAULT_USER_PROMPT_TEMPLATE.format(question=question)}
    )
    return messages


async def format_evaluation_prompt(
    question: str, contexts_str: str, answer: str, db: AsyncSession | None = None
) -> str:
    """Formats prompt string for Ragas LLM-as-a-Judge evaluation by fetching prompt from DB."""
    judge_prompt = await get_prompt_from_db(db, "evaluation_judge", DEFAULT_EVALUATION_JUDGE_PROMPT)
    return judge_prompt.format(
        question=question,
        contexts=contexts_str,
        answer=answer,
    )
