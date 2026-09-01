"""
Pydantic Schemas and Dataclasses for Phase 2 Document & Vision Ingestion.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class InspectionFinding(BaseModel):
    item_id: Optional[str] = Field(default=None, description="Identifier for component or weld joint")
    description: str = Field(..., description="Description of the finding or defect")
    severity: str = Field(default="MEDIUM", description="Severity level: LOW, MEDIUM, HIGH, CRITICAL")
    location: Optional[str] = Field(default=None, description="Physical location or tag on diagram")
    confidence: float = Field(default=1.0, description="Extraction confidence score (0.0 - 1.0)")


class IngestionStructuredOutput(BaseModel):
    document_title: Optional[str] = None
    date: Optional[str] = None
    inspector_name: Optional[str] = None
    plant_location: Optional[str] = None
    findings: List[InspectionFinding] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    handwriting_detected: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IngestionResult(BaseModel):
    file_path: str
    file_type: str
    extraction_method: str  # "pypdf_text", "tesseract_ocr", "vlm_qwen_vl", "hybrid"
    pages_processed: int
    raw_text: str
    structured: IngestionStructuredOutput
    execution_time_ms: float
    success: bool
    error: Optional[str] = None
