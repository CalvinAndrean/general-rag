from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, examples=["What were the main revenue drivers?"])
    chat_history: list[ChatMessage] | None = Field(
        default=None, description="Previous conversation history for context memory"
    )
    top_k: int = Field(4, ge=1, le=20, description="Number of top relevant chunks to retrieve")
    stream: bool = Field(True, description="Whether to stream the answer using SSE")


class SourceCitation(BaseModel):
    document_id: str
    document_name: str
    page_number: int | None = None
    snippet: str
    score: float | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
