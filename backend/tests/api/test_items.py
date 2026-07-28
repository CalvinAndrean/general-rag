import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_item(client: AsyncClient):
    # 1. Create item
    payload = {"title": "Test Item", "description": "A test item description"}
    create_res = await client.post("/api/v1/items/", json=payload)
    assert create_res.status_code == 201
    res_data = create_res.json()["data"]
    assert res_data["title"] == payload["title"]
    assert res_data["description"] == payload["description"]
    item_id = res_data["id"]

    # 2. Get item by ID
    get_res = await client.get(f"/api/v1/items/{item_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == item_id

    # 3. List items
    list_res = await client.get("/api/v1/items/")
    assert list_res.status_code == 200
    assert len(list_res.json()["items"]) == 1
    assert list_res.json()["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_get_item_not_found(client: AsyncClient):
    response = await client.get("/api/v1/items/non-existent-id")
    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "NOT_FOUND"
