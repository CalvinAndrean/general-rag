from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item
from app.repositories.base import BaseRepository


class ItemRepository(BaseRepository[Item]):
    """Repository handling database operations for Items."""

    def __init__(self, db: AsyncSession):
        super().__init__(model=Item, db=db)

    async def get_by_title(self, title: str) -> list[Item]:
        result = await self.db.execute(select(Item).where(Item.title == title))
        return list(result.scalars().all())
