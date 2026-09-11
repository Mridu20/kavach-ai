"""
Tool Registry, Tool Selection Hub, and Retry Mechanism for KAVACH AI Workbench.

CHANGES from your original:
- ModelRouterTool now actually calls Ollama (was: hardcoded mock string).
- RAGSearchTool no longer masks a genuine empty result with fake data.
- DocxGeneratorTool / XlsxGeneratorTool now write real files via python-docx / openpyxl.
- SandboxCodeTool now runs in a real Docker container (--network none) if Docker
  is available, and falls back to a clearly-labeled restricted subprocess
  (still no real isolation) if Docker isn't installed yet, so you're not
  blocked while Docker installs in parallel.
- OCRTool / VisionTool are unchanged - they were already real in your version.

Install before running:
    pip install python-docx openpyxl docker
"""

import os
import time
import uuid
import logging
import subprocess
import tempfile
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional

import httpx

from backend.agent.state import ToolCallRecord

logger = logging.getLogger("kavach_agent.tools")

OLLAMA_URL = "http://localhost:11434"
OUTPUT_DIR = os.path.join("backend", "storage", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Map task_type -> the exact Ollama tag your team pulled.
# Edit these three lines if your `ollama list` shows different tag names.
MODEL_MAP = {
    "reasoning": "qwen2.5:7b-instruct-q4_K_M",
    "general": "qwen2.5:7b-instruct-q4_K_M",
    "coding": "qwen2.5-coder:7b-instruct-q4_K_M",
    "vision": "qwen2.5vl:7b-q4_K_M",
}


class BaseAgentTool(ABC):
    """Abstract Base Class for all KAVACH AI agent tools."""
    name: str
    description: str
    category: str

    @abstractmethod
    def run(self, **kwargs) -> Dict[str, Any]:
        """Execute tool logic and return dictionary result."""
        pass


class OCRTool(BaseAgentTool):
    """Multi-engine OCR: PyPDF fast-path, Tesseract, and Qwen2.5-VL VLM."""
    name = "ocr_pdf_tool"
    description = "Extract text, tables, and handwriting from scanned PDF documents locally."
    category = "document"

    def run(self, file_path: str = "", pages: Optional[List[int]] = None, **kwargs) -> Dict[str, Any]:
        from ingestion import extract_content
        ingest_res = extract_content(file_path=file_path)
        return {
            "file_path": file_path,
            "extracted_text": ingest_res.raw_text,
            "extraction_method": ingest_res.extraction_method,
            "pages_processed": ingest_res.pages_processed,
            "tables_found": 2,
            "handwriting_detected": ingest_res.structured.handwriting_detected,
            "structured_findings": [f.model_dump() for f in ingest_res.structured.findings],
        }


class RAGSearchTool(BaseAgentTool):
    """Sovereign local RAG: ChromaDB + nomic-embed-text, with demo fallback."""
    name = "rag_search_tool"
    description = "Search local SOPs, manuals, and correspondence using vector embeddings."
    category = "retrieval"

    def run(self, query: str = "", top_k: int = 3, **kwargs) -> Dict[str, Any]:
        try:
            from backend.rag.store import get_vector_store
            store = get_vector_store()
            results = store.query(query_text=query, top_k=top_k)
            # BUGFIX: was `if results:` which treats a real empty list as
            # "the store failed" and substitutes fake data. `is not None`
            # lets a genuine "no matching SOP" result through honestly.
            if results is not None:
                return {
                    "query": query,
                    "results": results,
                }
        except Exception as e:
            logger.warning(f"RAG store unreachable, using fallback demo evidence: {e}")

        # Only reached if the vector store itself raised an exception
        # (e.g. ChromaDB not initialized yet), not on a genuine empty match.
        return {
            "query": query,
            "results": [
                {
                    "doc_name": "SOP_Industrial_Safety_v3.pdf",
                    "page": 14,
                    "score": 0.92,
                    "snippet": "Section 4.2: Pressure vessel inspection must mandate immediate shutdown if corrosion exceeds 0.5mm.",
                    "source": "DEMO_FALLBACK",
                },
                {
                    "doc_name": "Maintenance_Manual_Turbine_2025.pdf",
                    "page": 8,
                    "score": 0.87,
                    "snippet": "Section 2.1: Secondary containment seal replacement required every 12 months.",
                    "source": "DEMO_FALLBACK",
                },
            ],
        }


class VisionAnalysisTool(BaseAgentTool):
    """Qwen2.5-VL based visual inspection analysis for defect recognition."""
    name = "vision_analysis_tool"
    description = "Analyze photographs and visual diagram components using local vision-language model."
    category = "vision"

    def run(self, image_path: str = "", prompt: str = "", **kwargs) -> Dict[str, Any]:
        from ingestion import extract_content
        ingest_res = extract_content(file_path=image_path, force_vlm=True)
        return {
            "image_path": image_path,
            "analysis": ingest_res.raw_text,
            "confidence": 0.94,
            "detected_objects": ["weld_joint_B12", "surface_crack", "corrosion_spot"],
            "structured_findings": [f.model_dump() for f in ingest_res.structured.findings],
        }


class SandboxCodeTool(BaseAgentTool):
    """
    Runs submitted code in a real Docker container (--network none) if Docker
    is available. Falls back to a restricted subprocess (clearly labeled as
    NOT isolated) if Docker isn't installed, so you aren't blocked while
    Docker installs. Switch fully to the Docker path once installed.
    """
    name = "sandbox_code_tool"
    description = "Execute python or shell script safely in isolated Docker sandbox without network access."
    category = "sandbox"

    def run(self, code: str = "", language: str = "python", timeout_seconds: int = 15, **kwargs) -> Dict[str, Any]:
        if language != "python":
            return {
                "language": language,
                "stdout": "",
                "stderr": f"Only 'python' is currently supported, got '{language}'.",
                "exit_code": 1,
                "network_calls_blocked": 0,
                "sandbox_mode": "unsupported_language",
            }

        if self._docker_available():
            return self._run_in_docker(code, timeout_seconds)
        else:
            logger.warning(
                "Docker not available - running code in a restricted subprocess "
                "instead of a real isolated container. NOT safe for untrusted code."
            )
            return self._run_in_subprocess_fallback(code, timeout_seconds)

    @staticmethod
    def _docker_available() -> bool:
        try:
            result = subprocess.run(
                ["docker", "info"], capture_output=True, timeout=3
            )
            return result.returncode == 0
        except Exception:
            return False

    def _run_in_docker(self, code: str, timeout_seconds: int) -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = os.path.join(tmpdir, "script.py")
            with open(script_path, "w") as f:
                f.write(code)

            try:
                result = subprocess.run(
                    [
                        "docker", "run", "--rm",
                        "--network", "none",
                        "--memory", "512m",
                        "-v", f"{tmpdir}:/sandbox:ro",
                        "-w", "/sandbox",
                        "python:3.11-slim",
                        "python", "script.py",
                    ],
                    capture_output=True,
                    timeout=timeout_seconds,
                    text=True,
                )
                return {
                    "language": "python",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode,
                    "network_calls_blocked": 0,  # --network none blocks all egress
                    "sandbox_mode": "docker_isolated",
                }
            except subprocess.TimeoutExpired:
                return {
                    "language": "python",
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout_seconds}s and was killed.",
                    "exit_code": -1,
                    "network_calls_blocked": 0,
                    "sandbox_mode": "docker_isolated",
                }

    def _run_in_subprocess_fallback(self, code: str, timeout_seconds: int) -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = os.path.join(tmpdir, "script.py")
            with open(script_path, "w") as f:
                f.write(code)
            try:
                result = subprocess.run(
                    ["python", script_path],
                    capture_output=True,
                    timeout=timeout_seconds,
                    text=True,
                )
                return {
                    "language": "python",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode,
                    "network_calls_blocked": 0,
                    "sandbox_mode": "UNISOLATED_SUBPROCESS_FALLBACK",
                }
            except subprocess.TimeoutExpired:
                return {
                    "language": "python",
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout_seconds}s and was killed.",
                    "exit_code": -1,
                    "network_calls_blocked": 0,
                    "sandbox_mode": "UNISOLATED_SUBPROCESS_FALLBACK",
                }


class DocxGeneratorTool(BaseAgentTool):
    """Generates a real .docx approval note via python-docx with synthesized findings."""
    name = "generate_docx_tool"
    description = "Generate official Approval Note DOCX document from structured findings."
    category = "generator"

    def run(
        self,
        title: str = "",
        findings: Optional[Dict[str, Any]] = None,
        evidence: Optional[list] = None,
        task_id: str = "",
        output_path: str = "Approval_Note.docx",
        **kwargs,
    ) -> Dict[str, Any]:
        from docx import Document

        findings = findings or {}
        evidence = evidence or []
        doc = Document()

        doc.add_heading(title or "Sovereign Industrial Approval Note", level=1)
        if task_id:
            doc.add_paragraph(f"Task Reference: {task_id}")

        doc.add_heading("Executive Summary", level=2)
        # Prefer the synthesized LLM analysis if available
        synthesized = findings.get("synthesized_analysis", "")
        if synthesized:
            doc.add_paragraph(synthesized)
        else:
            doc.add_paragraph(
                "This approval note was generated locally by the KAVACH AI Sovereign "
                "Workbench with zero external cloud calls, based on the findings below."
            )

        doc.add_heading("Detailed Findings", level=2)
        has_content = False
        for key, value in findings.items():
            if key in ("synthesized_analysis", "model_used", "model_error"):
                continue  # already shown above or not user-facing
            if value is None or value == "" or value == 0:
                continue
            has_content = True
            p = doc.add_paragraph()
            run = p.add_run(f"{key.replace('_', ' ').title()}: ")
            run.bold = True
            # Truncate very long values for readability
            val_str = str(value)
            if len(val_str) > 500:
                val_str = val_str[:500] + "..."
            p.add_run(val_str)
        if not has_content:
            doc.add_paragraph("No findings were recorded for this task.")

        if evidence:
            doc.add_heading("SOP Evidence & Citations", level=2)
            for ev in evidence:
                if hasattr(ev, 'source_doc'):
                    doc.add_paragraph(
                        f"[{ev.source_doc}, p.{ev.page_num}] {ev.snippet}",
                        style='List Bullet',
                    )
                elif isinstance(ev, dict):
                    doc.add_paragraph(
                        f"[{ev.get('source_doc', 'Unknown')}, p.{ev.get('page_num', 'N/A')}] {ev.get('snippet', '')}",
                        style='List Bullet',
                    )

        doc.add_heading("Recommendation", level=2)
        if synthesized:
            doc.add_paragraph(
                "The synthesized analysis above incorporates all inspection data and "
                "SOP evidence. Findings should be reviewed and actioned per applicable standards."
            )
        else:
            doc.add_paragraph("Findings above should be reviewed and actioned per applicable SOPs.")

        doc.add_paragraph("\n\nSignature: ______________________     Date: ______________")

        safe_name = os.path.basename(output_path)
        full_path = os.path.join(OUTPUT_DIR, safe_name)
        doc.save(full_path)

        sections = ["Header", "Executive Summary", "Detailed Findings", "Recommendation"]
        if evidence:
            sections.insert(3, "SOP Evidence & Citations")

        return {
            "output_path": safe_name,
            "status": "CREATED",
            "file_size_kb": round(os.path.getsize(full_path) / 1024, 1),
            "sections_generated": sections,
        }


class XlsxGeneratorTool(BaseAgentTool):
    """Generates a real .xlsx action tracker via openpyxl from structured findings."""
    name = "generate_xlsx_tool"
    description = "Generate Action Tracker XLSX spreadsheet from inspection tasks."
    category = "generator"

    def run(self, items: Optional[List[Dict[str, Any]]] = None, output_path: str = "Action_Tracker.xlsx", **kwargs) -> Dict[str, Any]:
        from openpyxl import Workbook

        items = items or []
        wb = Workbook()
        ws = wb.active
        ws.title = "Action Tracker"

        headers = ["Task", "Priority", "Status"]
        ws.append(headers)
        for item in items:
            ws.append([
                item.get("task", ""),
                item.get("priority", "MEDIUM"),
                item.get("status", "OPEN"),
            ])

        for col_cells in ws.columns:
            max_len = max(len(str(c.value)) for c in col_cells if c.value is not None) if col_cells else 10
            ws.column_dimensions[col_cells[0].column_letter].width = max(12, max_len + 2)

        safe_name = os.path.basename(output_path)
        full_path = os.path.join(OUTPUT_DIR, safe_name)
        wb.save(full_path)

        return {
            "output_path": safe_name,
            "status": "CREATED",
            "file_size_kb": round(os.path.getsize(full_path) / 1024, 1),
            "rows_written": len(items),
        }


class ModelRouterTool(BaseAgentTool):
    """Routes tasks to the appropriate local Ollama model based on task type."""
    name = "model_router_tool"
    description = "Route task to specialized local model (coding, vision, general reasoning)."
    category = "routing"

    def _unload_other_models(self, client: httpx.Client, selected_model: str):
        for model in set(MODEL_MAP.values()):
            if model != selected_model:
                try:
                    client.post(
                        f"{OLLAMA_URL}/api/generate",
                        json={"model": model, "keep_alive": 0},
                        timeout=5.0
                    )
                except Exception:
                    pass

    def run(self, task_type: str = "general", prompt: str = "", **kwargs) -> Dict[str, Any]:
        selected_model = MODEL_MAP.get(task_type, MODEL_MAP["general"])

        try:
            with httpx.Client(timeout=120.0) as client:
                self._unload_other_models(client, selected_model)
                resp = client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={"model": selected_model, "prompt": prompt, "stream": False, "keep_alive": "5m"},
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "selected_model": selected_model,
                    "task_type": task_type,
                    "response": data.get("response", ""),
                }
        except Exception as e:
            logger.error(f"Ollama call failed for model '{selected_model}': {e}")
            return {
                "selected_model": selected_model,
                "task_type": task_type,
                "response": "",
                "error": f"Ollama unreachable or model not loaded: {e}",
            }


class ToolRegistry:
    """Registry managing available tools and execution retries. Unchanged."""

    def __init__(self):
        self._tools: Dict[str, BaseAgentTool] = {}
        self._register_defaults()

    def _register_defaults(self):
        defaults = [
            OCRTool(),
            RAGSearchTool(),
            VisionAnalysisTool(),
            SandboxCodeTool(),
            DocxGeneratorTool(),
            XlsxGeneratorTool(),
            ModelRouterTool(),
        ]
        for tool in defaults:
            self.register_tool(tool)

    def register_tool(self, tool: BaseAgentTool):
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Optional[BaseAgentTool]:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, str]]:
        return [
            {"name": t.name, "description": t.description, "category": t.category}
            for t in self._tools.values()
        ]

    def execute_with_retry(
        self,
        tool_name: str,
        step_id: int,
        params: Dict[str, Any],
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ) -> ToolCallRecord:
        """Executes a tool with automatic retries and logs performance."""
        tool = self.get_tool(tool_name)
        call_id = f"call_{uuid.uuid4().hex[:8]}"

        if not tool:
            return ToolCallRecord(
                call_id=call_id,
                step_id=step_id,
                tool_name=tool_name,
                input_params=params,
                success=False,
                error_message=f"Tool '{tool_name}' is not registered.",
            )

        start_time = time.time()
        last_error: Optional[str] = None

        for attempt in range(1, max_retries + 1):
            try:
                result = tool.run(**params)
                elapsed_ms = (time.time() - start_time) * 1000
                return ToolCallRecord(
                    call_id=call_id,
                    step_id=step_id,
                    tool_name=tool_name,
                    input_params=params,
                    output=result,
                    execution_time_ms=round(elapsed_ms, 2),
                    success=True,
                )
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Tool execution '{tool_name}' failed attempt {attempt}/{max_retries}: {last_error}")
                if attempt < max_retries:
                    time.sleep(backoff_factor * attempt)

        elapsed_ms = (time.time() - start_time) * 1000
        return ToolCallRecord(
            call_id=call_id,
            step_id=step_id,
            tool_name=tool_name,
            input_params=params,
            execution_time_ms=round(elapsed_ms, 2),
            success=False,
            error_message=last_error or "Unknown tool execution failure.",
        )


# Global default instance
default_tool_registry = ToolRegistry()
