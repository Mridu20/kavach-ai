"""
Unit and Integration Test Suite for Phase 2 Document & Vision Ingestion.
"""

import os
import unittest
from ingestion.schemas import IngestionResult, IngestionStructuredOutput
from ingestion.pdf_parser import PyPDFParser
from ingestion.ocr_tesseract import TesseractOCREngine
from ingestion.vision_vlm import QwenVisionEngine
from ingestion.extractor import extract_content


class TestIngestionModule(unittest.TestCase):

    def test_pypdf_parser_nonexistent(self):
        has_text, text, pages, meta = PyPDFParser.extract_text_layer("non_existent_file.pdf")
        self.assertFalse(has_text)
        self.assertEqual(pages, 0)

    def test_ocr_tesseract_image(self):
        text, meta = TesseractOCREngine.process_image("ingestion/samples/sample_plant_inspection.txt")
        self.assertIsInstance(text, str)
        self.assertGreater(len(text), 0)

    def test_qwen_vision_engine_offline(self):
        raw_text, structured, meta = QwenVisionEngine.analyze_document_vlm("ingestion/samples/sample_plant_inspection.txt")
        self.assertGreater(len(raw_text), 0)
        self.assertIsInstance(structured, IngestionStructuredOutput)
        self.assertGreater(len(structured.findings), 0)
        self.assertIn(structured.findings[0].severity, ["LOW", "MEDIUM", "HIGH", "CRITICAL"])

    def test_extract_content_sample(self):
        sample_file = "ingestion/samples/sample_plant_inspection.txt"
        result: IngestionResult = extract_content(file_path=sample_file)
        self.assertTrue(result.success)
        self.assertGreater(len(result.raw_text), 0)
        self.assertGreater(result.execution_time_ms, 0)
        self.assertGreater(len(result.structured.findings), 0)

    def test_extract_content_not_found(self):
        result = extract_content(file_path="missing_file.pdf")
        self.assertFalse(result.success)
        self.assertIn("File not found", result.error)


if __name__ == "__main__":
    unittest.main()
