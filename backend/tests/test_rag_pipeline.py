import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_document_ingestion_and_query_flow(client: AsyncClient):
    # 0. Register test user to get token
    reg_payload = {
        "email": "testpipeline@example.com",
        "password": "password123",
        "full_name": "Pipeline Tester",
        "tenant_name": "Pipeline Org",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    token = reg_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Set model in tenant settings
    await client.put("/api/v1/settings/", json={"llm_model": "mock-model"}, headers=headers)

    # 1. Upload mock document (PDF)
    pdf_content = b"%PDF-1.4 Mock PDF text content for RAG testing."
    files = {"file": ("test_doc.pdf", io.BytesIO(pdf_content), "application/pdf")}

    upload_res = await client.post("/api/v1/documents/", files=files, headers=headers)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()["data"]
    assert doc_data["name"] == "test_doc.pdf"
    assert doc_data["status"] == "indexed"
    doc_id = doc_data["id"]

    # 2. List documents
    list_res = await client.get("/api/v1/documents/", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()["data"]["documents"]
    assert len(docs) >= 1
    assert any(d["id"] == doc_id for d in docs)

    # 3. Query RAG pipeline (non-streaming mode for test assertion)
    query_payload = {"question": "What is in the document?", "stream": False}
    query_res = await client.post("/api/v1/query/", json=query_payload, headers=headers)
    if query_res.status_code != 200:
        print("QUERY RESPONSE ERROR:", query_res.status_code, query_res.text)
    assert query_res.status_code == 200
    res_json = query_res.json()["data"]
    assert "answer" in res_json
    assert "sources" in res_json

    # 4. Delete document
    del_res = await client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 204

    # 5. Verify deletion
    list_after_del = await client.get("/api/v1/documents/", headers=headers)
    docs_after = list_after_del.json()["data"]["documents"]
    assert not any(d["id"] == doc_id for d in docs_after)
