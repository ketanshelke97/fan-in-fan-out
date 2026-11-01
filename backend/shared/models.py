from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class FileEntry(BaseModel):
    file_name: str
    blob_url: str
    sas_token: Optional[str] = None
    byte_size: Optional[int] = 0


class BatchManifest(BaseModel):
    batch_id: str
    batch_name: str
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    files: List[FileEntry]


class ExtractedEntity(BaseModel):
    category: str
    text: str
    confidence: float = 1.0


class ExtractedTable(BaseModel):
    table_index: int
    row_count: int
    column_count: int
    cells: List[List[str]] = Field(default_factory=list)


class WorkerResult(BaseModel):
    file_name: str
    status: str  # "SUCCESS" or "FAILED"
    duration_ms: int = 0
    pages_processed: int = 0
    extracted_entities: List[ExtractedEntity] = Field(default_factory=list)
    tables: List[ExtractedTable] = Field(default_factory=list)
    word_count: int = 0
    sentiment_summary: Optional[str] = "Neutral"
    error_message: Optional[str] = None


class ConsolidatedDossier(BaseModel):
    id: str  # maps to batch_id for Cosmos DB partition key
    batch_id: str
    batch_name: str
    total_files: int
    successful_files: int
    failed_files: int
    total_pages: int
    total_duration_ms: int
    parallel_speedup_factor: float
    global_entities: Dict[str, List[str]] = Field(default_factory=dict)
    documents: List[WorkerResult] = Field(default_factory=list)
    status: str = "COMPLETED"
    indexed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
