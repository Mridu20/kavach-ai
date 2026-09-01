"""
Master Ingestion Pipeline Entrypoint: extract_content(file_path) -> IngestionResult.
Intelligently routes documents across PyPDF fast-path, Tesseract OCR, and Qwen2.5-VL VLM.
"""

import os
import time
import logging
from typing import Optional, Dict, Any
from ingestion.schemas import IngestionResult, IngestionStructuredOutput, InspectionFinding
from ingestion.pdf_parser import PyPDFParser
from ingestion.ocr_tesseract import TesseractOCREngine
from ingestion.vision_vlm import QwenVisionEngine

logger = logging.getLogger("kavach_ai.ingestion.extractor")


def extract_content(
    file_path: str,
    force_ocr: bool = False,
    force_vlm: bool = False,
    ollama_vlm_url: Optional[str] = None,
) -> IngestionResult:
    """
    Main ingestion pipeline function.

    Args:
        file_path: Path to PDF document or image file.
        force_ocr: Force Tesseract OCR even if text layer exists.
        force_vlm: Force Qwen2.5-VL VLM processing.
        ollama_vlm_url: Optional custom URL for VLM server.

    Returns:
        IngestionResult object with raw text, structured JSON findings, and telemetry.
    """
    start_time = time.time()

    if not os.path.exists(file_path):
        return IngestionResult(
            file_path=file_path,
            file_type="unknown",
            extraction_method="error",
            pages_processed=0,
            raw_text="",
            structured=IngestionStructuredOutput(),
            execution_time_ms=0.0,
            success=False,
            error=f"File not found: {file_path}",
        )

    file_ext = os.path.splitext(file_path)[1].lower()
    is_pdf = file_ext == ".pdf"
    is_img = TesseractOCREngine.is_image(file_path)

    raw_text = ""
    structured = IngestionStructuredOutput()
    pages_processed = 1
    extraction_method = "unknown"

    try:
        if is_pdf and not force_ocr and not force_vlm:
            # 1. Try PyPDF Fast-Path
            has_text, text, pages, meta = PyPDFParser.extract_text_layer(file_path)
            if has_text:
                raw_text = text
                pages_processed = pages
                extraction_method = "pypdf_text"
                structured = IngestionStructuredOutput(
                    document_title=os.path.basename(file_path),
                    findings=[
                        InspectionFinding(
                            description="Extracted digital text layer successfully via pypdf fast-path.",
                            severity="LOW",
                        )
                    ],
                    metadata=meta,
                )

        if not raw_text or force_ocr or force_vlm or is_img:
            # 2. Scanned PDF or Image -> Run OCR & VLM Engines
            if is_pdf:
                ocr_text, pages_processed, ocr_meta = TesseractOCREngine.process_scanned_pdf(file_path)
            else:
                ocr_text, ocr_meta = TesseractOCREngine.process_image(file_path)

            vlm_text, vlm_structured, vlm_meta = QwenVisionEngine.analyze_document_vlm(
                file_path=file_path,
                ollama_url=ollama_vlm_url,
            )

            raw_text = f"{ocr_text}\n\n=== VLM ANALYSIS ===\n{vlm_text}"
            structured = vlm_structured
            extraction_method = "hybrid_ocr_vlm" if (ocr_text and vlm_text) else "vlm_qwen_vl"

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return IngestionResult(
            file_path=file_path,
            file_type=file_ext.replace(".", ""),
            extraction_method=extraction_method,
            pages_processed=pages_processed,
            raw_text=raw_text,
            structured=structured,
            execution_time_ms=elapsed_ms,
            success=True,
        )

    except Exception as e:
        logger.error(f"Ingestion pipeline error processing '{file_path}': {e}", exc_info=True)
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        return IngestionResult(
            file_path=file_path,
            file_type=file_ext.replace(".", ""),
            extraction_method="failed",
            pages_processed=0,
            raw_text="",
            structured=IngestionStructuredOutput(),
            execution_time_ms=elapsed_ms,
            success=False,
            error=str(e),
        )
