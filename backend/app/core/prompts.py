"""Swappable RAG Prompt Templates."""

DEFAULT_SYSTEM_PROMPT = """You are an intelligent RAG assistant. Answer the user's question accurately using ONLY the provided context snippets below.
If the context does not contain enough information to answer the question, state clearly that the provided documents do not contain the answer.

### Context Snippets:
{context}
"""

DEFAULT_USER_PROMPT_TEMPLATE = """Question: {question}"""


def format_rag_prompt(context_snippets: list[dict], question: str) -> list[dict]:
    """Formats context snippets into system and user messages for LLM completion."""
    formatted_context_blocks = []
    for idx, snippet in enumerate(context_snippets, 1):
        doc_name = snippet.get("doc_name", "Unknown Document")
        page_num = snippet.get("page_number")
        page_info = f" (Page {page_num})" if page_num else ""
        content = snippet.get("content", "").strip()
        formatted_context_blocks.append(f"[{idx}] Source: {doc_name}{page_info}\n{content}")

    context_str = "\n\n".join(formatted_context_blocks)
    system_content = DEFAULT_SYSTEM_PROMPT.format(
        context=context_str if context_str else "No relevant context found."
    )

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": DEFAULT_USER_PROMPT_TEMPLATE.format(question=question)},
    ]
