import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_prompt import SystemPrompt

logger = logging.getLogger(__name__)

# In-memory cache for ultra-fast lookup (refreshed on updates)
_PROMPT_CACHE: dict[str, str] = {}


class SystemPromptRepository:
    """Repository for managing system prompts stored in general_rag.system_prompts database table."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_type(self, prompt_type: str) -> SystemPrompt | None:
        """Fetch system prompt record by prompt_type."""
        stmt = select(SystemPrompt).where(
            SystemPrompt.prompt_type == prompt_type, SystemPrompt.is_active.is_(True)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_prompt_content(self, prompt_type: str, fallback: str) -> str:
        """Fetch prompt content by type, returning fallback if not found in database."""
        if prompt_type in _PROMPT_CACHE:
            return _PROMPT_CACHE[prompt_type]

        try:
            prompt_obj = await self.get_by_type(prompt_type)
            if prompt_obj and prompt_obj.content:
                _PROMPT_CACHE[prompt_type] = prompt_obj.content
                return prompt_obj.content
        except Exception as e:
            logger.warning(f"Failed to fetch system prompt '{prompt_type}' from DB: {e}")

        return fallback

    async def list_all(self) -> list[SystemPrompt]:
        """List all system prompts."""
        stmt = select(SystemPrompt).order_by(SystemPrompt.prompt_type)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def update_prompt(
        self, prompt_type: str, content: str, name: str | None = None
    ) -> SystemPrompt | None:
        """Update system prompt content and clear cache."""
        prompt_obj = await self.get_by_type(prompt_type)
        if not prompt_obj:
            return None

        prompt_obj.content = content
        if name:
            prompt_obj.name = name

        await self.db.flush()
        _PROMPT_CACHE.pop(prompt_type, None)
        return prompt_obj


def clear_prompt_cache():
    """Clear in-memory system prompt cache."""
    _PROMPT_CACHE.clear()
