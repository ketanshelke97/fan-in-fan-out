import io
import re
import time
from typing import List
from pypdf import PdfReader
from backend.shared.models import ExtractedEntity, ExtractedTable, WorkerResult


def extract_document_mock(file_bytes: bytes, file_name: str) -> WorkerResult:
    """
    Extracts text, metadata, tables, and entities from PDF bytes locally using pypdf.
    Provides identical schema output to Azure AI Document Intelligence, enabling
    ultra-fast stress-testing without external API rate limits.
    """
    start_time = time.time()
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        page_count = len(reader.pages)
        full_text = ""
        for page in reader.pages:
            page_text = page.extract_text() or ""
            full_text += page_text + "\n"

        words = full_text.split()
        word_count = len(words)

        # Heuristic entity extraction via regex
        entities: List[ExtractedEntity] = []

        # 1. Dates
        date_matches = set(re.findall(r"\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b", full_text, re.IGNORECASE))
        for d in list(date_matches)[:5]:
            entities.append(ExtractedEntity(category="Date", text=d, confidence=0.98))

        # 2. Currency / Financial
        curr_matches = set(re.findall(r"\$\s?[0-9,]+(?:\.[0-9]{2})?", full_text))
        for c in list(curr_matches)[:5]:
            entities.append(ExtractedEntity(category="Currency", text=c, confidence=0.95))

        # 3. Organizations / Entities
        org_matches = set(re.findall(r"\b(?:Azure|Microsoft|FTC|Department of Justice|Supreme Court|SEC|Google|Acme Corp|Consolidated Industries)\b", full_text))
        for org in org_matches:
            entities.append(ExtractedEntity(category="Organization", text=org, confidence=0.99))

        # 4. Statutes / Regulation clauses
        law_matches = set(re.findall(r"\b(?:Title \d+|Section \d+|Clause [A-Z0-9]+|Article \d+)\b", full_text, re.IGNORECASE))
        for law in list(law_matches)[:4]:
            entities.append(ExtractedEntity(category="Statute", text=law, confidence=0.92))

        # Heuristic table extraction (lines with tab or pipe delimiters, or synthetic from content)
        tables: List[ExtractedTable] = []
        table_lines = [line.strip() for line in full_text.split("\n") if "|" in line or "\t" in line]
        if table_lines:
            cells = [re.split(r"[|\t]+", line) for line in table_lines[:8]]
            if cells:
                col_count = max(len(row) for row in cells)
                tables.append(ExtractedTable(
                    table_index=0,
                    row_count=len(cells),
                    column_count=col_count,
                    cells=cells
                ))
        else:
            # Generate a structured summary table of key metrics
            tables.append(ExtractedTable(
                table_index=0,
                row_count=3,
                column_count=2,
                cells=[
                    ["Metric", "Value"],
                    ["Page Count", str(page_count)],
                    ["Word Count", str(word_count)]
                ]
            ))

        # Simple sentiment heuristic
        lower_text = full_text.lower()
        if any(w in lower_text for w in ["violat", "breach", "fail", "penalty", "error", "liabilit"]):
            sentiment = "Critical / High Risk"
        elif any(w in lower_text for w in ["compliant", "approved", "success", "profit", "growth"]):
            sentiment = "Positive / Compliant"
        else:
            sentiment = "Neutral / Informational"

        duration_ms = int((time.time() - start_time) * 1000)
        return WorkerResult(
            file_name=file_name,
            status="SUCCESS",
            duration_ms=duration_ms,
            pages_processed=page_count,
            extracted_entities=entities,
            tables=tables,
            word_count=word_count,
            sentiment_summary=sentiment
        )
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return WorkerResult(
            file_name=file_name,
            status="FAILED",
            duration_ms=duration_ms,
            pages_processed=0,
            extracted_entities=[],
            tables=[],
            word_count=0,
            sentiment_summary="Unknown",
            error_message=str(e)
        )
