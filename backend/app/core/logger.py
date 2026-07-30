"""Rich Terminal Logger Utility for Cognava RAG Core.

Provides beautiful, step-by-step formatted terminal output for:
- API request/response logging (middleware)
- Document ingestion, OCR processing, chunking, embedding generation
"""

from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

console = Console()

# ─── HTTP Method Color Mapping ───────────────────────────────────────────────

METHOD_COLORS = {
    "GET": "green",
    "POST": "yellow",
    "PUT": "blue",
    "PATCH": "magenta",
    "DELETE": "red",
    "OPTIONS": "dim",
    "HEAD": "dim",
}

STATUS_COLORS = {
    2: "bold green",  # 2xx
    3: "bold cyan",  # 3xx
    4: "bold yellow",  # 4xx
    5: "bold red",  # 5xx
}


def _status_style(status_code: int) -> str:
    return STATUS_COLORS.get(status_code // 100, "white")


# ─── API Request/Response Logger ─────────────────────────────────────────────


class APILogger:
    """Logs API requests and responses with rich formatting."""

    # Paths to skip logging (noisy health checks, static files)
    SKIP_PATHS = frozenset({"/", "/health", "/favicon.ico", "/openapi.json"})
    SKIP_PREFIXES = ("/docs", "/redoc", "/static")

    @staticmethod
    def should_log(path: str) -> bool:
        if path in APILogger.SKIP_PATHS:
            return False
        return not any(path.startswith(p) for p in APILogger.SKIP_PREFIXES)

    @staticmethod
    def log_request(method: str, path: str, client_ip: str, body: dict | str | None = None):
        method_color = METHOD_COLORS.get(method.upper(), "white")
        header = Text()
        header.append("▶ ", style="bold white")
        header.append(method.upper(), style=f"bold {method_color}")
        header.append(f" {path}", style="bold white")
        header.append(f"  from {client_ip}", style="dim")

        console.print()
        console.print(
            Panel(
                header,
                title="[bold cyan]← INCOMING REQUEST[/bold cyan]",
                border_style="cyan",
                expand=False,
            )
        )

        if body and body not in ({}, "", "null", b""):
            APILogger._log_body("Request Body", body, "cyan")

    @staticmethod
    def log_response(
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        body_preview: str | None = None,
    ):
        method_color = METHOD_COLORS.get(method.upper(), "white")
        status_style = _status_style(status_code)

        header = Text()
        header.append("◀ ", style="bold white")
        header.append(method.upper(), style=f"bold {method_color}")
        header.append(f" {path}", style="bold white")
        header.append("  →  ", style="dim")
        header.append(str(status_code), style=status_style)
        header.append(f"  ({duration_ms:.0f}ms)", style="dim italic")

        border_color = "green" if status_code < 400 else ("yellow" if status_code < 500 else "red")

        console.print(
            Panel(
                header,
                title=f"[bold {border_color}]→ RESPONSE[/bold {border_color}]",
                border_style=border_color,
                expand=False,
            )
        )

        if body_preview:
            APILogger._log_body("Response Preview", body_preview, border_color, max_len=500)

    @staticmethod
    def log_error(method: str, path: str, error: str, duration_ms: float):
        header = Text()
        header.append("✘ ", style="bold red")
        header.append(method.upper(), style="bold red")
        header.append(f" {path}", style="bold white")
        header.append(f"  ({duration_ms:.0f}ms)", style="dim italic")
        header.append(f"\n  {error}", style="red")

        console.print(
            Panel(
                header,
                title="[bold red]✘ ERROR[/bold red]",
                border_style="red",
                expand=False,
            )
        )

    @staticmethod
    def _log_body(title: str, body: Any, color: str, max_len: int = 800):
        if isinstance(body, (dict, list)):
            import json

            body_str = json.dumps(body, indent=2, ensure_ascii=False, default=str)
        else:
            body_str = str(body)

        if len(body_str) > max_len:
            body_str = body_str[:max_len] + f"\n... ({len(body_str) - max_len} chars truncated)"

        console.print(
            Panel(
                body_str,
                title=f"[bold {color}]{title}[/bold {color}]",
                border_style=color,
                expand=False,
            )
        )


# ─── Query Processing Logger ────────────────────────────────────────────────


class QueryLogger:
    """Logs RAG query processing steps with rich formatting."""

    @staticmethod
    def log_intent_classification(question: str, intent: str, duration_ms: float):
        intent_colors = {
            "greeting": "green",
            "out_of_scope": "yellow",
            "knowledge_query": "blue",
        }
        color = intent_colors.get(intent, "white")

        table = Table(show_header=False, expand=False, padding=(0, 1))
        table.add_column("Key", style="dim", width=16)
        table.add_column("Value", style="white")

        q_preview = question[:120] + ("..." if len(question) > 120 else "")
        table.add_row("Question", f"[white]{q_preview}[/white]")
        table.add_row("Intent", f"[bold {color}]{intent.upper()}[/bold {color}]")
        table.add_row("Latency", f"[dim]{duration_ms:.0f}ms[/dim]")

        console.print(
            Panel(
                table,
                title="[bold magenta]🧠 Intent Classification[/bold magenta]",
                border_style="magenta",
                expand=False,
            )
        )

    @staticmethod
    def log_retrieval(question: str, top_k: int, chunks_found: int, duration_ms: float):
        table = Table(show_header=False, expand=False, padding=(0, 1))
        table.add_column("Key", style="dim", width=16)
        table.add_column("Value", style="white")

        table.add_row("Top K Requested", str(top_k))
        table.add_row("Chunks Retrieved", f"[bold cyan]{chunks_found}[/bold cyan]")
        table.add_row("Latency", f"[dim]{duration_ms:.0f}ms[/dim]")

        console.print(
            Panel(
                table,
                title="[bold blue]🔍 Vector Retrieval[/bold blue]",
                border_style="blue",
                expand=False,
            )
        )

    @staticmethod
    def log_llm_stream(model: str, intent: str, tokens: int, duration_ms: float):
        table = Table(show_header=False, expand=False, padding=(0, 1))
        table.add_column("Key", style="dim", width=16)
        table.add_column("Value", style="white")

        table.add_row("Model", f"[bold cyan]{model}[/bold cyan]")
        table.add_row("Intent", intent)
        table.add_row("Output Tokens", f"[bold yellow]{tokens}[/bold yellow]")
        table.add_row("Stream Duration", f"[dim]{duration_ms:.0f}ms[/dim]")

        console.print(
            Panel(
                table,
                title="[bold green]⚡ LLM Streaming Complete[/bold green]",
                border_style="green",
                expand=False,
            )
        )

    @staticmethod
    def log_query_complete(
        question: str,
        intent: str,
        model: str,
        total_tokens: int,
        citations_count: int,
        total_ms: float,
    ):
        table = Table(show_header=False, expand=False, padding=(0, 1))
        table.add_column("Key", style="dim", width=16)
        table.add_column("Value", style="white")

        q_preview = question[:100] + ("..." if len(question) > 100 else "")
        table.add_row("Question", f"[white]{q_preview}[/white]")
        table.add_row("Intent", f"[bold]{intent}[/bold]")
        table.add_row("Model", f"[cyan]{model}[/cyan]")
        table.add_row("Total Tokens", f"[bold yellow]{total_tokens:,}[/bold yellow]")
        table.add_row("Citations", str(citations_count))
        table.add_row("Total Latency", f"[bold green]{total_ms:.0f}ms[/bold green]")

        console.print(
            Panel(
                table,
                title="[bold bright_green]✅ Query Pipeline Complete[/bold bright_green]",
                border_style="bright_green",
                expand=False,
            )
        )


# ─── Ragas Evaluation Logger ──────────────────────────────────────────────


class EvaluationLogger:
    """Helper class for logging step-by-step Ragas LLM-as-a-Judge evaluation with rich formatting."""

    @staticmethod
    def log_start(query_log_id: str, model: str, question: str):
        q_preview = question[:100] + ("..." if len(question) > 100 else "")
        console.print()
        console.print(
            Panel(
                f"[bold yellow]▶ TRIGGERING RAGAS LLM-AS-A-JUDGE EVALUATION[/bold yellow]\n"
                f"Query Log ID: [bold white]{query_log_id}[/bold white]\n"
                f"Evaluator Model: [bold cyan]{model}[/bold cyan]\n"
                f"Question: [italic white]{q_preview}[/italic white]",
                title="[bold yellow]⚖ RAGAS EVALUATION START[/bold yellow]",
                border_style="yellow",
                expand=False,
            )
        )

    @staticmethod
    def log_raw_judge_response(raw_text: str):
        from rich.syntax import Syntax

        preview = raw_text.strip()
        syntax = Syntax(preview, "markdown" if "```" in preview else "json", theme="monokai", line_numbers=True)
        console.print(
            Panel(
                syntax,
                title="[bold magenta]📝 RAW LLM JUDGE OUTPUT[/bold magenta]",
                border_style="magenta",
                expand=False,
            )
        )

    @staticmethod
    def log_result(
        query_log_id: str,
        faithfulness: float,
        answer_relevancy: float,
        context_precision: float,
        context_recall: float,
        overall: float,
        reasoning: str,
        status: str = "COMPLETED",
    ):
        table = Table(show_header=True, header_style="bold green")
        table.add_column("Metric", style="bold cyan", width=20)
        table.add_column("Score", style="bold white", width=12)
        table.add_column("Quality Assessment", style="white")

        def _badge(val: float) -> str:
            pct = int(round(val * 100))
            if val >= 0.8:
                return f"[bold green]{pct}% (Excellent)[/bold green]"
            if val >= 0.5:
                return f"[bold yellow]{pct}% (Fair)[/bold yellow]"
            return f"[bold red]{pct}% (Poor)[/bold red]"

        table.add_row("Faithfulness", f"{faithfulness:.4f}", _badge(faithfulness))
        table.add_row("Answer Relevancy", f"{answer_relevancy:.4f}", _badge(answer_relevancy))
        table.add_row("Context Precision", f"{context_precision:.4f}", _badge(context_precision))
        table.add_row("Context Recall", f"{context_recall:.4f}", _badge(context_recall))
        table.add_row("OVERALL SCORE", f"[bold bright_green]{overall:.4f}[/bold bright_green]", _badge(overall))

        console.print(
            Panel(
                table,
                title=f"[bold green]📊 RAGAS EVALUATION RESULT ({status})[/bold green]",
                border_style="green",
                expand=False,
            )
        )
        if reasoning:
            console.print(
                Panel(
                    reasoning,
                    title="[bold blue]💡 LLM Judge Reasoning[/bold blue]",
                    border_style="blue",
                    expand=False,
                )
            )


# ─── Ingestion Logger ───────────────────────────────────────────────────────


class IngestionLogger:
    """Helper class for logging step-by-step ingestion progress with rich formatting."""

    @staticmethod
    def step_header(step_number: int, title: str):
        console.print()
        console.print(
            Panel(
                f"[bold cyan]STEP {step_number}: {title.upper()}[/bold cyan]",
                border_style="cyan",
                expand=False,
            )
        )

    @staticmethod
    def log_s3_upload(filename: str, file_size: int, s3_key: str, s3_url: str):
        table = Table(show_header=True, header_style="bold green")
        table.add_column("Property", style="dim")
        table.add_column("Value", style="bold white")

        table.add_row("Filename", filename)
        table.add_row("File Size", f"{file_size:,} bytes")
        table.add_row("S3 Key", s3_key)
        table.add_row("S3 Public URL", s3_url)

        console.print(
            Panel(table, title="[bold green]S3 Storage Result[/bold green]", border_style="green")
        )

    @staticmethod
    def log_ocr_start(filename: str, model: str):
        console.print(
            f"[bold yellow]▶ Triggering 2-Step Mistral OCR for:[/bold yellow] [white]{filename}[/white] (Model: [magenta]{model}[/magenta])"
        )

    @staticmethod
    def log_ocr_annotation(file_id: str, annotation: Any, page_count: int):
        if not isinstance(annotation, dict):
            if isinstance(annotation, str):
                annotation = {"summary": annotation}
            else:
                annotation = {}

        table = Table(show_header=True, header_style="bold yellow")
        table.add_column("Field", style="bold cyan")
        table.add_column("Extracted Annotation / Metadata", style="white")

        table.add_row("Mistral File ID", file_id)
        table.add_row("Pages Processed", str(page_count))
        table.add_row("Document Type", str(annotation.get("document_type", "N/A")))
        table.add_row("Short Description", str(annotation.get("short_description", "N/A")))
        table.add_row("Summary", str(annotation.get("summary", "N/A")))

        console.print(
            Panel(
                table,
                title="[bold yellow]Mistral OCR Document Annotation[/bold yellow]",
                border_style="yellow",
            )
        )

    @staticmethod
    def log_ocr_images(extracted_images: list[tuple[str, str]]):
        if not extracted_images:
            console.print("[dim]No embedded images found in document OCR.[/dim]")
            return

        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Image ID", style="bold yellow")
        table.add_column("Uploaded S3 URL", style="cyan")

        for img_id, s3_url in extracted_images:
            table.add_row(img_id, s3_url)

        console.print(
            Panel(
                table,
                title=f"[bold magenta]OCR Images & Tables Uploaded to S3 ({len(extracted_images)})[/bold magenta]",
                border_style="magenta",
            )
        )

    @staticmethod
    def log_chunks(chunks: list[dict[str, Any]]):
        table = Table(show_header=True, header_style="bold blue")
        table.add_column("#", style="bold dim", width=4)
        table.add_column("Length", style="bold yellow", width=8)
        table.add_column("Page", style="cyan", width=6)
        table.add_column("Metadata Dict", style="green")
        table.add_column("Content Preview", style="white")

        for idx, c in enumerate(chunks):
            content = c.get("content", "")
            meta = c.get("metadata", {})
            page = str(c.get("page_number", 1))
            preview = content[:100].replace("\n", " ") + ("..." if len(content) > 100 else "")
            table.add_row(
                str(idx),
                f"{len(content)} char",
                page,
                str(meta),
                preview,
            )

        console.print(
            Panel(
                table,
                title=f"[bold blue]Document Text Chunks Generated ({len(chunks)})[/bold blue]",
                border_style="blue",
            )
        )

    @staticmethod
    def log_embeddings(model_name: str, count: int, dimension: int):
        table = Table(show_header=True, header_style="bold purple")
        table.add_column("Parameter", style="bold cyan")
        table.add_column("Details", style="white")

        table.add_row("Embedding Model", model_name)
        table.add_row("Total Vectors", str(count))
        table.add_row("Vector Dimension", f"[bold green]{dimension} float dimensions[/bold green]")
        table.add_row("Raw Vector Output", "[dim](Hidden - 39k+ characters vector omitted)[/dim]")

        console.print(
            Panel(
                table,
                title="[bold purple]OpenRouter Embeddings Result[/bold purple]",
                border_style="purple",
            )
        )

    @staticmethod
    def log_raw_markdown(markdown_text: str):
        from rich.syntax import Syntax

        syntax = Syntax(markdown_text, "markdown", theme="monokai", line_numbers=True)
        console.print(
            Panel(
                syntax,
                title="[bold bright_green]RAW MISTRAL OCR EXTRACTED MARKDOWN[/bold bright_green]",
                border_style="bright_green",
            )
        )

    @staticmethod
    def log_db_saved(doc_id: str, chunk_count: int, schema: str = "general_rag"):
        console.print(
            Panel(
                f"[bold green]SUCCESSFULLY INDEXED IN POSTGRESQL![/bold green]\n"
                f"Schema: [bold cyan]{schema}[/bold cyan]\n"
                f"Document ID: [bold white]{doc_id}[/bold white]\n"
                f"Chunks Inserted: [bold yellow]{chunk_count}[/bold yellow]\n"
                f"Status: [bold green]indexed[/bold green]",
                border_style="green",
            )
        )
