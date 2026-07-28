from app.core.exceptions import NotFoundError
from app.repositories.item import ItemRepository
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate


class ItemService:
    """Service encapsulating business logic for Items."""

    def __init__(self, item_repo: ItemRepository):
        self.item_repo = item_repo

    async def get_item(self, item_id: str) -> ItemResponse:
        item = await self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError(message=f"Item with id '{item_id}' not found")
        return ItemResponse.model_validate(item)

    async def list_items(
        self, page: int = 1, page_size: int = 20
    ) -> tuple[list[ItemResponse], int]:
        skip = (page - 1) * page_size
        items = await self.item_repo.get_multi(skip=skip, limit=page_size)
        total = await self.item_repo.count()
        return [ItemResponse.model_validate(item) for item in items], total

    async def create_item(self, data: ItemCreate) -> ItemResponse:
        item = await self.item_repo.create(data.model_dump())
        return ItemResponse.model_validate(item)

    async def update_item(self, item_id: str, data: ItemUpdate) -> ItemResponse:
        item = await self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError(message=f"Item with id '{item_id}' not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_item = await self.item_repo.update(item, update_data)
        return ItemResponse.model_validate(updated_item)

    async def delete_item(self, item_id: str) -> None:
        item = await self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError(message=f"Item with id '{item_id}' not found")
        await self.item_repo.delete(item)
