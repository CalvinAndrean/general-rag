"""System Prompt Utilities — Dynamically fetched from PostgreSQL database (general_rag.system_prompts)."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.system_prompt import SystemPromptRepository

logger = logging.getLogger(__name__)

DEFAULT_USER_PROMPT_TEMPLATE = """Question: {question}"""


async def get_system_prompt(db: AsyncSession | None, prompt_type: str) -> str:
    """Fetch prompt content directly from DB general_rag.system_prompts table."""
    if not db:
        logger.warning(
            f"No DB session provided for system prompt '{prompt_type}'. Using empty fallback."
        )
        return ""

    repo = SystemPromptRepository(db)
    return await repo.get_prompt_content(prompt_type, fallback="")


async def format_intent_messages(
    question: str,
    chat_history: list[dict] | None = None,
    db: AsyncSession | None = None,
) -> list[dict]:
    """Formats messages array for LLM intent classification by fetching prompt from DB."""
    intent_prompt = await get_system_prompt(db, "intent_classifier")
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
        base_system = await get_system_prompt(db, "greeting")
    elif intent == "out_of_scope":
        base_system = await get_system_prompt(db, "out_of_scope")
    elif intent == "unclear":
        base_system = await get_system_prompt(db, "unclear")
    else:
        formatted_context_blocks = []
        for idx, snippet in enumerate(context_snippets, 1):
            doc_name = snippet.get("doc_name", "Unknown Document")
            page_num = snippet.get("page_number")
            page_info = f" (Page {page_num})" if page_num else ""
            content = snippet.get("content", "").strip()
            formatted_context_blocks.append(f"[{idx}] Source: {doc_name}{page_info}\n{content}")

        context_str = "\n\n".join(formatted_context_blocks)
        raw_kq_prompt = await get_system_prompt(db, "knowledge_query")
        base_system = raw_kq_prompt.format(
            context=context_str if context_str else "No relevant document context found."
        )

    if custom_user_prompt and custom_user_prompt.strip():
        system_content = f"### Additional Custom User Instructions:\n{custom_user_prompt.strip()}\n\n{base_system}"
    else:
        system_content = base_system

    messages = [{"role": "system", "content": system_content}]

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
    """Formats prompt string for Ragas LLM-as-a-Judge knowledge query evaluation by fetching prompt from DB."""
    judge_prompt = await get_system_prompt(db, "evaluation_judge")
    return judge_prompt.format(
        question=question,
        contexts=contexts_str,
        answer=answer,
    )


async def format_intent_handling_evaluation_prompt(
    intent: str, question: str, answer: str, db: AsyncSession | None = None
) -> str:
    """Formats prompt string for LLM-as-a-Judge intent handling evaluation by fetching prompt from DB."""
    judge_prompt = await get_system_prompt(db, "intent_handling_judge")
    return judge_prompt.format(
        intent=intent.upper(),
        question=question,
        answer=answer,
    )
