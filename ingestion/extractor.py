"""
Master Ingestion Pipeline Entrypoint: extract_content(file_path) -> IngestionResult.
Intelligently routes user-provided documents across PyPDF fast-path, Tesseract OCR, and Qwen2.5-VL VLM.
Honest extraction without fake or hallucinated industrial findings.
"""

import os
import time
import logging
from typing import Optional
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
    Extracts text and content from user-supplied documents.

    Args:
        file_path: Path to document or image file.
        force_ocr: Force Tesseract OCR even if text layer exists.
        force_vlm: Force Qwen2.5-VL VLM processing.
        ollama_vlm_url: Optional custom URL for VLM server.

    Returns:
        IngestionResult object with raw extracted text, structure, and telemetry.
    """
    start_time = time.time()

    target_path = file_path

    # Resolve relative candidate paths if needed
    if not os.path.exists(target_path):
        candidates = [
            os.path.join("backend", "storage", "uploads", os.path.basename(file_path)),
            os.path.join("ingestion", "samples", os.path.basename(file_path)),
        ]
        for cand in candidates:
            if os.path.exists(cand):
                target_path = cand
                break

    # If the file does not exist, return an honest error — never fabricate demo data
    if not os.path.exists(target_path):
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        return IngestionResult(
            file_path=file_path,
            file_type="unknown",
            extraction_method="error",
            pages_processed=0,
            raw_text="",
            structured=IngestionStructuredOutput(),
            execution_time_ms=elapsed_ms,
            success=False,
            error=f"File not found: {file_path}",
        )

    file_path = target_path
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

            if ocr_text and vlm_text:
                raw_text = f"{ocr_text}\n\n=== VLM ANALYSIS ===\n{vlm_text}"
                extraction_method = "hybrid_ocr_vlm"
            elif ocr_text:
                raw_text = ocr_text
                extraction_method = "tesseract_ocr"
            else:
                raw_text = vlm_text
                extraction_method = "vlm_qwen_vl"

            structured = vlm_structured

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
