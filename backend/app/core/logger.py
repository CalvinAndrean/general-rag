"""Rich Terminal Logger Utility for General RAG Core.

Provides beautiful, step-by-step formatted terminal output for document ingestion,
OCR processing, chunking, embedding generation, and database storage.
"""

from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


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
