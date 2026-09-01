"""
PDF Text Layer Parser using PyPDF for fast-path direct text extraction.
"""

import os
import logging
from typing import Dict, Any, Tuple
from pypdf import PdfReader

logger = logging.getLogger("kavach_ai.ingestion.pdf")


class PyPDFParser:
    """Fast-path direct text extractor for digital PDFs with embedded text layers."""

    @staticmethod
    def is_pdf(file_path: str) -> bool:
        return file_path.lower().endswith(".pdf")

    @staticmethod
    def extract_text_layer(file_path: str, min_text_len: int = 50) -> Tuple[bool, str, int, Dict[str, Any]]:
        """
        Extracts embedded text layer from PDF.

        Returns:
            Tuple[has_text_layer: bool, extracted_text: str, page_count: int, metadata: Dict]
        """
        if not os.path.exists(file_path):
            logger.error(f"PDF file not found: {file_path}")
            return False, "", 0, {"error": "File not found"}

        try:
            reader = PdfReader(file_path)
            page_count = len(reader.pages)
            extracted_pages = []

            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    extracted_pages.append(f"--- PAGE {idx + 1} ---\n{text.strip()}")

            full_text = "\n\n".join(extracted_pages)
            has_text_layer = len(full_text.strip()) >= min_text_len

            metadata = {
                "total_pages": page_count,
                "text_length": len(full_text),
                "is_encrypted": reader.is_encrypted,
            }

            logger.info(f"PyPDF processed '{os.path.basename(file_path)}': text_layer={has_text_layer}, pages={page_count}")
            return has_text_layer, full_text, page_count, metadata

        except Exception as e:
            logger.warning(f"PyPDF extraction failed for '{file_path}': {e}")
            return False, "", 0, {"error": str(e)}
