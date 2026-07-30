import base64
import io
import json
import logging
import re
import uuid
from collections.abc import AsyncGenerator

import httpx

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logger import IngestionLogger

logger = logging.getLogger(__name__)


class S3Client:
    """Async wrapper for S3 storage operations."""

    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME
        self.endpoint_url = settings.s3_endpoint_final
        self.access_key = settings.s3_access_key_final
        self.secret_key = settings.s3_secret_key_final

    async def upload_file(
        self, file_content: bytes, s3_key: str, content_type: str = "application/octet-stream"
    ) -> str:
        """Uploads file content to S3 storage."""
        if not self.access_key or not self.secret_key or self.access_key.startswith("your-"):
            logger.warning("S3 credentials not configured; using mock S3 key storage.")
            return f"{self.endpoint_url}/{self.bucket}/{s3_key}"

        try:
            import aioboto3

            session = aioboto3.Session()
            async with session.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=settings.S3_REGION,
            ) as s3:
                await s3.put_object(
                    Bucket=self.bucket,
                    Key=s3_key,
                    Body=file_content,
                    ContentType=content_type,
                )
                return f"{self.endpoint_url}/{self.bucket}/{s3_key}"
        except Exception as e:
            logger.error(f"S3 Upload failed for {s3_key}: {e}")
            raise AppException(message=f"S3 storage upload failed: {e!s}", code="S3_UPLOAD_ERROR")

    async def delete_file(self, s3_key: str) -> None:
        """Deletes file from S3 storage."""
        if not self.access_key or not self.secret_key or self.access_key.startswith("your-"):
            return

        try:
            import aioboto3

            session = aioboto3.Session()
            async with session.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=settings.S3_REGION,
            ) as s3:
                await s3.delete_object(Bucket=self.bucket, Key=s3_key)
        except Exception as e:
            logger.error(f"S3 Delete failed for {s3_key}: {e}")
            raise AppException(message=f"S3 storage delete failed: {e!s}", code="S3_DELETE_ERROR")


class MistralOCRClient:
    """Mistral OCR client implementing 2-step File Upload + OCR API flow with image extraction to S3."""

    def __init__(self):
        self.api_key = settings.MISTRAL_OCR_API_KEY
        self.files_url = "https://api.mistral.ai/v1/files"
        self.ocr_url = "https://api.mistral.ai/v1/ocr"

    def _is_mock_mode(self) -> bool:
        return (
            not self.api_key
            or self.api_key.startswith("your-")
            or settings.ENVIRONMENT.lower() == "testing"
        )

    async def extract_text_and_metadata(
        self, file_content: bytes, filename: str
    ) -> tuple[str, dict]:
        """Uploads file to Mistral /files, requests OCR, uploads images to S3, and returns (extracted_text, annotation_dict)."""
        if self._is_mock_mode():
            logger.warning("MISTRAL_OCR_API_KEY not configured; returning mock OCR text.")
            return (
                f"[OCR Text Extracted from {filename}]\nSample content extracted via OCR.",
                {
                    "document_type": "mock_document",
                    "short_description": f"Mock document for {filename}",
                    "summary": "Mock summary content.",
                },
            )

        try:
            IngestionLogger.log_ocr_start(filename, "mistral-ocr-latest")
            async with httpx.AsyncClient(timeout=120.0) as client:
                headers = {"Authorization": f"Bearer {self.api_key}"}

                # 1. Step 1: Upload file to https://api.mistral.ai/v1/files with form-data (file + purpose='ocr')
                files = {"file": (filename, io.BytesIO(file_content))}
                data = {"purpose": "ocr"}

                upload_res = await client.post(
                    self.files_url, headers=headers, files=files, data=data
                )
                if upload_res.status_code not in (200, 201):
                    raise AppException(
                        message=f"Mistral file upload failed ({upload_res.status_code}): {upload_res.text}",
                        code="OCR_UPLOAD_FAILURE",
                    )

                file_info = upload_res.json()
                file_id = file_info.get("id")
                if not file_id:
                    raise AppException(
                        message="Mistral /files response did not return a valid file 'id'",
                        code="OCR_UPLOAD_FAILURE",
                    )

                # 2. Step 2: Call https://api.mistral.ai/v1/ocr with file_id and json schema payload
                payload = {
                    "document": {
                        "type": "file",
                        "file_id": file_id,
                    },
                    "model": "mistral-ocr-latest",
                    "table_format": "markdown",
                    "include_blocks": True,
                    "confidence_scores_granularity": "word",
                    "include_image_base64": True,
                    "document_annotation_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "schema": {
                                "properties": {
                                    "document_type": {"title": "Document_Type", "type": "string"},
                                    "short_description": {
                                        "title": "Short_Description",
                                        "type": "string",
                                    },
                                    "summary": {"title": "Summary", "type": "string"},
                                },
                                "required": ["document_type", "short_description", "summary"],
                                "title": "DocumentAnnotation",
                                "type": "object",
                                "additionalProperties": False,
                            },
                            "name": "document_annotation",
                            "strict": True,
                        },
                    },
                }

                ocr_res = await client.post(self.ocr_url, headers=headers, json=payload)
                if ocr_res.status_code != 200:
                    raise AppException(
                        message=f"Mistral OCR request failed ({ocr_res.status_code}): {ocr_res.text}",
                        code="OCR_FAILURE",
                    )

                ocr_data = ocr_res.json()
                pages = ocr_data.get("pages", [])

                # Extract annotation metadata safely (handles dict, JSON string, or string)
                document_annotation = (
                    ocr_data.get("document_annotation")
                    or ocr_data.get("annotation")
                    or ocr_data.get("document_annotation_format")
                    or {}
                )
                if isinstance(document_annotation, str):
                    try:
                        document_annotation = json.loads(document_annotation)
                    except Exception:
                        document_annotation = {"summary": document_annotation}

                if not isinstance(document_annotation, dict):
                    document_annotation = {}
                document_annotation["page_count"] = len(pages)

                IngestionLogger.log_ocr_annotation(
                    file_id=file_id,
                    annotation=document_annotation,
                    page_count=len(pages),
                )

                page_texts = []
                uploaded_images_log = []

                logger.info(f"MISTRAL OCR TOP-LEVEL KEYS: {list(ocr_data.keys())}")

                for page_idx, p in enumerate(pages):
                    markdown = p.get("markdown", "")
                    images = p.get("images", [])
                    tables = p.get("tables", [])
                    blocks = p.get("blocks", [])

                    logger.info(
                        f"PAGE {page_idx} KEYS: {list(p.keys())} | images: {len(images)}, tables: {len(tables)}, blocks: {len(blocks)}"
                    )

                    # Combine all media/table objects from page
                    media_objects = images + tables
                    for b in blocks:
                        if isinstance(b, dict) and b.get("id"):
                            media_objects.append(b)

                    # Upload embedded images / tables to S3 or replace markdown content
                    for media in media_objects:
                        img_id = media.get("id")
                        img_b64 = media.get("image_base64")
                        tbl_content = (
                            media.get("content") or media.get("markdown") or media.get("text")
                        )

                        # If table object has raw markdown/text table content, replace placeholder with raw table
                        if tbl_content and isinstance(tbl_content, str) and img_id:
                            link_pattern = re.compile(rf"!?\[[^\]]*\]\({re.escape(img_id)}\)")
                            if link_pattern.search(markdown):
                                markdown = link_pattern.sub(f"\n\n{tbl_content}\n\n", markdown)
                            else:
                                markdown = markdown.replace(img_id, f"\n\n{tbl_content}\n\n")

                        # If media has base64 image, upload to S3
                        elif img_b64 and img_id:
                            try:
                                if "," in img_b64:
                                    _, b64_str = img_b64.split(",", 1)
                                else:
                                    b64_str = img_b64

                                raw_img_bytes = base64.b64decode(b64_str)
                                content_type = (
                                    "image/jpeg"
                                    if img_id.endswith((".jpg", ".jpeg"))
                                    else "image/png"
                                )
                                s3_img_key = f"documents/images/{uuid.uuid4().hex[:8]}_{img_id}"
                                s3_img_url = await s3_client.upload_file(
                                    raw_img_bytes, s3_img_key, content_type=content_type
                                )

                                # Replace filename with S3 URL in markdown cleanly (prevents double nesting)
                                link_pattern = re.compile(rf"!?\[[^\]]*\]\({re.escape(img_id)}\)")
                                if link_pattern.search(markdown):
                                    markdown = link_pattern.sub(
                                        f"![Document Image]({s3_img_url})", markdown
                                    )
                                else:
                                    standalone_pattern = re.compile(
                                        rf"(?<!https://[^\s]*)(?<!http://[^\s]*){re.escape(img_id)}"
                                    )
                                    markdown = standalone_pattern.sub(s3_img_url, markdown)

                                uploaded_images_log.append((img_id, s3_img_url))
                            except Exception as img_err:
                                logger.warning(
                                    f"Failed to upload OCR image {img_id} to S3: {img_err}"
                                )

                    # Clean up any leftover unhandled [tbl-X.md](tbl-X.md) markers
                    markdown = re.sub(r"!?\[(tbl-\d+(?:\.md)?)\]\(\1\)", r"[Table \1]", markdown)

                    if markdown.strip():
                        page_texts.append(markdown.strip())

                IngestionLogger.log_ocr_images(uploaded_images_log)

                full_extracted = "\n\n---\n\n".join(page_texts)
                final_text = full_extracted or ocr_data.get("text", "")
                IngestionLogger.log_raw_markdown(final_text)
                return final_text, document_annotation

        except Exception as e:
            if isinstance(e, AppException):
                raise
            logger.error(f"Mistral OCR processing failed: {e}")
            raise AppException(message=f"OCR processing failed: {e!s}", code="OCR_FAILURE")

    async def extract_text(self, file_content: bytes, filename: str) -> str:
        text, _ = await self.extract_text_and_metadata(file_content, filename)
        return text


class OpenRouterClient:
    """OpenRouter gateway client for embeddings and LLM completions."""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1"

    def _is_mock_mode(self) -> bool:
        return (
            not self.api_key
            or self.api_key.startswith("your-")
            or settings.ENVIRONMENT.lower() == "testing"
        )

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generates embedding vectors for a list of texts."""
        if self._is_mock_mode():
            import hashlib

            dummy_dim = 2048
            embeddings = []
            for t in texts:
                hash_val = int(hashlib.md5(t.encode("utf-8")).hexdigest(), 16)
                vec = [(float((hash_val >> i) % 100) / 100.0) for i in range(dummy_dim)]
                embeddings.append(vec)
            IngestionLogger.log_embeddings("mock-embedding", len(texts), dummy_dim)
            return embeddings

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.EMBEDDING_MODEL_NAME,
                        "input": texts,
                    },
                )
                if response.status_code != 200:
                    raise AppException(
                        message=f"Embedding generation failed: {response.text}",
                        code="EMBEDDING_FAILURE",
                    )
                data = response.json()
                embeddings_list = [item["embedding"] for item in data["data"]]
                dim = len(embeddings_list[0]) if embeddings_list else 0
                IngestionLogger.log_embeddings(
                    settings.EMBEDDING_MODEL_NAME, len(embeddings_list), dim
                )
                return embeddings_list
        except Exception as e:
            if isinstance(e, AppException):
                raise
            logger.error(f"Embedding call failed: {e}")
            raise AppException(message=f"Embedding model failure: {e!s}", code="EMBEDDING_FAILURE")

    async def stream_chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[tuple[str, str | dict], None]:
        """Streams completion tokens and usage payload from OpenRouter LLM."""
        if self._is_mock_mode():
            mock_text = "Based on the provided documents, here is the information requested."
            for word in mock_text.split(" "):
                yield ("token", word + " ")
            return

        target_model = model or settings.LLM_MODEL_NAME

        body: dict = {
            "model": target_model,
            "messages": messages,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if temperature is not None:
            body["temperature"] = temperature
        if max_tokens is not None:
            body["max_tokens"] = max_tokens

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                ) as response:
                    if response.status_code != 200:
                        err_body = await response.aread()
                        raise AppException(
                            message=f"LLM streaming failed with status {response.status_code}: {err_body.decode()}",
                            code="LLM_FAILURE",
                        )
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            content = line[6:].strip()
                            if content == "[DONE]":
                                break
                            try:
                                payload = json.loads(content)
                                if payload.get("usage"):
                                    yield ("usage", payload["usage"])

                                choices = payload.get("choices", [])
                                if choices and len(choices) > 0:
                                    delta = choices[0].get("delta", {}).get("content", "")
                                    if delta:
                                        yield ("token", delta)
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            if isinstance(e, AppException):
                raise
            logger.error(f"LLM streaming failure: {e}")
            raise AppException(message=f"LLM provider failure: {e!s}", code="LLM_FAILURE")

    async def get_chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 600,
    ) -> str:
        """Non-streaming completion for LLM evaluation and structured tasks."""
        full_text = []
        async for item_type, item_data in self.stream_chat_completion(
            messages, model=model, temperature=temperature, max_tokens=max_tokens
        ):
            if item_type == "token" and isinstance(item_data, str):
                full_text.append(item_data)
        return "".join(full_text).strip()


s3_client = S3Client()
ocr_client = MistralOCRClient()
openrouter_client = OpenRouterClient()
