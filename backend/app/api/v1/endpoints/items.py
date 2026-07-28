import math
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.item import ItemRepository
from app.schemas.common import PaginatedResponse, PaginationMeta, ResponseEnvelope
from app.schemas.item import ItemCreate, ItemResponse, ItemUpdate
from app.services.item import ItemService

router = APIRouter()


def get_item_service(db: AsyncSession = Depends(get_db)) -> ItemService:
    repo = ItemRepository(db=db)
    return ItemService(item_repo=repo)


# Annotated dependency types for FastAPI
DatabaseDep = Annotated[AsyncSession, Depends(get_db)]
ItemServiceDep = Annotated[ItemService, Depends(get_item_service)]


@router.post(
    "/", response_model=ResponseEnvelope[ItemResponse], status_code=status.HTTP_201_CREATED
)
async def create_item(
    payload: ItemCreate,
    service: ItemServiceDep,
):
    """Create a new item."""
    created = await service.create_item(payload)
    return ResponseEnvelope(data=created)


@router.get("/{item_id}", response_model=ResponseEnvelope[ItemResponse])
async def get_item(
    item_id: str,
    service: ItemServiceDep,
):
    """Get an item by ID."""
    item = await service.get_item(item_id)
    return ResponseEnvelope(data=item)


@router.get("/", response_model=PaginatedResponse[ItemResponse])
async def list_items(
    service: ItemServiceDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List items with pagination."""
    items, total = await service.list_items(page=page, page_size=page_size)
    total_pages = math.ceil(total / page_size) if page_size > 0 else 0
    return PaginatedResponse(
        items=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.patch("/{item_id}", response_model=ResponseEnvelope[ItemResponse])
async def update_item(
    item_id: str,
    payload: ItemUpdate,
    service: ItemServiceDep,
):
    """Update an existing item."""
    updated = await service.update_item(item_id, payload)
    return ResponseEnvelope(data=updated)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    service: ItemServiceDep,
):
    """Delete an item by ID."""
    await service.delete_item(item_id)
