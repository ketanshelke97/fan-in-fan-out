import os
import time
from typing import List, Optional
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
try:
    from shared.models import ExtractedEntity, ExtractedTable, WorkerResult
except ImportError:
    from backend.shared.models import ExtractedEntity, ExtractedTable, WorkerResult


def get_doc_intelligence_client() -> Optional[DocumentIntelligenceClient]:
    endpoint = os.environ.get("DOCUMENT_INTELLIGENCE_ENDPOINT")
    key = os.environ.get("DOCUMENT_INTELLIGENCE_KEY")
    if not endpoint or not key:
        return None
    return DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))


def extract_document_ai(file_bytes: bytes, file_name: str, blob_url: Optional[str] = None) -> WorkerResult:
    """
    Invokes Azure AI Document Intelligence (Free F0 / S0) to perform deep layout,
    tabular matrix, and key-value pair extraction.
    """
    start_time = time.time()
    client = get_doc_intelligence_client()
    if not client:
        return WorkerResult(
            file_name=file_name,
            status="FAILED",
            duration_ms=0,
            pages_processed=0,
            error_message="Azure AI Document Intelligence credentials not configured."
        )

    try:
        if blob_url:
            poller = client.begin_analyze_document(
                "prebuilt-layout",
                body=AnalyzeDocumentRequest(url_source=blob_url)
            )
        elif file_bytes:
            poller = client.begin_analyze_document(
                "prebuilt-layout",
                body=AnalyzeDocumentRequest(bytes_source=file_bytes)
            )
        else:
            return WorkerResult(
                file_name=file_name,
                status="FAILED",
                duration_ms=0,
                pages_processed=0,
                error_message="No document payload provided (both blob_url and file_bytes are empty)."
            )

        result = poller.result()

        page_count = len(result.pages) if result.pages else 1
        extracted_tables: List[ExtractedTable] = []
        if result.tables:
            for idx, table in enumerate(result.tables):
                grid = [["" for _ in range(table.column_count)] for _ in range(table.row_count)]
                for cell in table.cells:
                    grid[cell.row_index][cell.column_index] = cell.content
                extracted_tables.append(ExtractedTable(
                    table_index=idx,
                    row_count=table.row_count,
                    column_count=table.column_count,
                    cells=grid
                ))

        # Extract entities from key-value pairs and paragraphs
        extracted_entities: List[ExtractedEntity] = []
        full_text = ""
        if result.paragraphs:
            for p in result.paragraphs:
                full_text += p.content + " "

        if hasattr(result, "key_value_pairs") and result.key_value_pairs:
            for kv in result.key_value_pairs:
                key_text = kv.key.content if kv.key else ""
                val_text = kv.value.content if kv.value else ""
                if key_text and val_text:
                    extracted_entities.append(ExtractedEntity(
                        category=f"Field: {key_text}",
                        text=val_text,
                        confidence=kv.confidence if hasattr(kv, "confidence") and kv.confidence else 0.95
                    ))

        duration_ms = int((time.time() - start_time) * 1000)
        return WorkerResult(
            file_name=file_name,
            status="SUCCESS",
            duration_ms=duration_ms,
            pages_processed=page_count,
            extracted_entities=extracted_entities,
            tables=extracted_tables,
            word_count=len(full_text.split()),
            sentiment_summary="Analyzed via Azure AI"
        )
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return WorkerResult(
            file_name=file_name,
            status="FAILED",
            duration_ms=duration_ms,
            pages_processed=0,
            error_message=str(e)
        )
