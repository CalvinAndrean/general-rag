import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.repositories.item import ItemRepository
from app.schemas.item import ItemCreate
from app.services.item import ItemService


@pytest.mark.asyncio
async def test_item_service_crud(db_session: AsyncSession):
    repo = ItemRepository(db=db_session)
    service = ItemService(item_repo=repo)

    # Create
    created = await service.create_item(
        ItemCreate(title="Service Item", description="Service test")
    )
    assert created.title == "Service Item"

    # Get
    fetched = await service.get_item(created.id)
    assert fetched.id == created.id

    # Not Found
    with pytest.raises(NotFoundError):
        await service.get_item("invalid-id")
