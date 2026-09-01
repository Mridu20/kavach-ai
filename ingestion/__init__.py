"""
KAVACH AI Phase 2 — Document & Vision Ingestion Module.
Provides multi-engine ingestion: PyPDF fast-path, Tesseract OCR, and Qwen2.5-VL VLM.
"""

from ingestion.schemas import IngestionResult, IngestionStructuredOutput, InspectionFinding
from ingestion.extractor import extract_content

__all__ = [
    "IngestionResult",
    "IngestionStructuredOutput",
    "InspectionFinding",
    "extract_content",
]
