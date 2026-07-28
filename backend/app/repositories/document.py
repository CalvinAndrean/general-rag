import json
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentChunk
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Repository handling CRUD and vector similarity search for Documents & Chunks."""

    def __init__(self, db: AsyncSession):
        super().__init__(model=Document, db=db)

    async def list_all(self) -> list[Document]:
        result = await self.db.execute(select(Document).order_by(Document.created_at.desc()))
        return list(result.scalars().all())

    async def create_chunks(self, chunks: list[dict]) -> None:
        """Bulk inserts document chunks."""
        chunk_objs = []
        for c in chunks:
            data = c.copy()
            if "metadata" in data and "metadata_" not in data:
                data["metadata_"] = data.pop("metadata")
            chunk_objs.append(DocumentChunk(**data))
        self.db.add_all(chunk_objs)
        await self.db.flush()

    async def search_similar_chunks(
        self, query_vector: list[float], top_k: int = 4
    ) -> list[tuple[DocumentChunk, Document, float]]:
        """Vector similarity search returning top-k matching chunks, associated document, and score."""
        bind = self.db.get_bind()
        is_postgres = bind.dialect.name == "postgresql"

        if is_postgres:
            stmt = (
                select(
                    DocumentChunk,
                    Document,
                    DocumentChunk.embedding.cosine_distance(query_vector).label("distance"),
                )
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(Document.status == "indexed", Document.is_active == True)
                .order_by("distance")
                .limit(top_k)
            )
            result = await self.db.execute(stmt)
            matches = []
            for chunk, doc, distance in result.all():
                score = max(0.0, 1.0 - float(distance))
                matches.append((chunk, doc, score))
            return matches

        # Fallback in-memory cosine similarity for SQLite tests
        stmt = (
            select(DocumentChunk, Document)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.status == "indexed")
        )
        result = await self.db.execute(stmt)
        all_chunks = result.all()

        scored = []
        for chunk, doc in all_chunks:
            emb = chunk.embedding
            if not emb:
                continue
            if isinstance(emb, str):
                try:
                    emb = json.loads(emb)
                except Exception:
                    continue

            # Calculate cosine similarity manually for test environment
            dot_product = sum(a * b for a, b in zip(query_vector, emb))
            norm_a = math.sqrt(sum(a * a for a in query_vector))
            norm_b = math.sqrt(sum(b * b for b in emb))
            sim = dot_product / (norm_a * norm_b) if norm_a and norm_b else 0.0
            scored.append((chunk, doc, sim))

        scored.sort(key=lambda x: x[2], reverse=True)
        return scored[:top_k]
