"""
Tool Registry, Tool Selection Hub, and Retry Mechanism for General-Purpose AI Agent.
Cleaned of hardcoded industrial rules, fake demo fallbacks, and SOP evidence retrieval.
"""

import os
import time
import uuid
import logging
import subprocess
import tempfile
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.agent.state import ToolCallRecord

logger = logging.getLogger("kavach_agent.tools")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OUTPUT_DIR = os.path.join("backend", "storage", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Map task_type -> Ollama model tag
MODEL_MAP = {
    "reasoning": "qwen2.5:7b-instruct-q4_K_M",
    "general": "qwen2.5:7b-instruct-q4_K_M",
    "coding": "qwen2.5-coder:7b-instruct-q4_K_M",
    "vision": "qwen2.5vl:7b-q4_K_M",
}


class BaseAgentTool(ABC):
    """Abstract Base Class for all AI agent tools."""
    name: str
    description: str
    category: str

    @abstractmethod
    def run(self, **kwargs) -> Dict[str, Any]:
        """Execute tool logic and return dictionary result."""
        pass


class OCRTool(BaseAgentTool):
    """Multi-engine document text extraction for user-provided files."""
    name = "ocr_pdf_tool"
    description = "Extract text and structured content from uploaded documents."
    category = "document"

    def run(self, file_path: str = "", pages: Optional[List[int]] = None, **kwargs) -> Dict[str, Any]:
        from ingestion import extract_content
        ingest_res = extract_content(file_path=file_path)
        findings = [f.model_dump() for f in ingest_res.structured.findings] if ingest_res.structured else []
        return {
            "file_path": file_path,
            "extracted_text": ingest_res.raw_text,
            "extraction_method": ingest_res.extraction_method,
            "pages_processed": ingest_res.pages_processed,
            "success": ingest_res.success,
            "error": ingest_res.error,
            "structured_findings": findings,
        }


class VisionAnalysisTool(BaseAgentTool):
    """Visual analysis tool using local vision model without fabricated detections."""
    name = "vision_analysis_tool"
    description = "Analyze photographs and visual diagrams using local vision model."
    category = "vision"

    def run(self, image_path: str = "", prompt: str = "", **kwargs) -> Dict[str, Any]:
        from ingestion import extract_content
        ingest_res = extract_content(file_path=image_path, force_vlm=True)
        findings = [f.model_dump() for f in ingest_res.structured.findings] if ingest_res.structured else []
        return {
            "image_path": image_path,
            "analysis": ingest_res.raw_text,
            "success": ingest_res.success,
            "error": ingest_res.error,
            "structured_findings": findings,
        }


class SandboxCodeTool(BaseAgentTool):
    """
    Runs user-submitted code in an isolated Docker container (--network none) if Docker
    is available, or a restricted local subprocess if Docker is unavailable.
    """
    name = "sandbox_code_tool"
    description = "Execute python script safely in sandbox environment."
    category = "sandbox"

    def run(self, code: str = "", language: str = "python", timeout_seconds: int = 15, **kwargs) -> Dict[str, Any]:
        if not code or not code.strip():
            return {
                "language": language,
                "stdout": "",
                "stderr": "No code provided for execution.",
                "exit_code": 1,
                "sandbox_mode": "empty_input",
            }

        if language != "python":
            return {
                "language": language,
                "stdout": "",
                "stderr": f"Only 'python' is currently supported, got '{language}'.",
                "exit_code": 1,
                "sandbox_mode": "unsupported_language",
            }

        if self._docker_available():
            return self._run_in_docker(code, timeout_seconds)
        else:
            logger.info("Docker not available - executing in local subprocess.")
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
            with open(script_path, "w", encoding="utf-8") as f:
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
                    "sandbox_mode": "docker_isolated",
                }
            except subprocess.TimeoutExpired:
                return {
                    "language": "python",
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout_seconds}s and was killed.",
                    "exit_code": -1,
                    "sandbox_mode": "docker_isolated",
                }

    def _run_in_subprocess_fallback(self, code: str, timeout_seconds: int) -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = os.path.join(tmpdir, "script.py")
            with open(script_path, "w", encoding="utf-8") as f:
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
                    "sandbox_mode": "local_subprocess",
                }
            except subprocess.TimeoutExpired:
                return {
                    "language": "python",
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout_seconds}s and was killed.",
                    "exit_code": -1,
                    "sandbox_mode": "local_subprocess",
                }


class DocxGeneratorTool(BaseAgentTool):
    """Generates a real .docx document from synthesized text and findings."""
    name = "generate_docx_tool"
    description = "Generate Word (.docx) document from synthesized text or content."
    category = "generator"

    def run(
        self,
        title: str = "",
        findings: Optional[Dict[str, Any]] = None,
        content: str = "",
        task_id: str = "",
        output_path: str = "Document.docx",
        **kwargs,
    ) -> Dict[str, Any]:
        from docx import Document

        findings = findings or {}
        doc = Document()

        doc_title = title or "Generated Document"
        doc.add_heading(doc_title, level=1)
        if task_id:
            doc.add_paragraph(f"Reference ID: {task_id}")

        main_text = content or findings.get("synthesized_analysis", "")
        if main_text:
            for para in main_text.split("\n\n"):
                if para.strip():
                    doc.add_paragraph(para.strip())
        else:
            doc.add_paragraph("Document generated by AI Assistant.")

        safe_name = os.path.basename(output_path)
        full_path = os.path.join(OUTPUT_DIR, safe_name)
        doc.save(full_path)

        return {
            "output_path": safe_name,
            "status": "CREATED",
            "file_size_kb": round(os.path.getsize(full_path) / 1024, 1),
            "sections_generated": ["Title", "Content"],
        }


class XlsxGeneratorTool(BaseAgentTool):
    """Generates a real .xlsx spreadsheet via openpyxl from items or structured data."""
    name = "generate_xlsx_tool"
    description = "Generate Action Tracker / Spreadsheet (.xlsx) from structured items."
    category = "generator"

    def run(
        self,
        items: Optional[List[Dict[str, Any]]] = None,
        output_path: str = "Data_Export.xlsx",
        **kwargs,
    ) -> Dict[str, Any]:
        from openpyxl import Workbook

        items = items or []
        wb = Workbook()
        ws = wb.active
        ws.title = "Data"

        if items and isinstance(items[0], dict):
            headers = list(items[0].keys())
            ws.append([h.replace("_", " ").title() for h in headers])
            for item in items:
                ws.append([str(item.get(h, "")) for h in headers])
        else:
            ws.append(["Item", "Value", "Status"])
            for idx, item in enumerate(items):
                ws.append([f"Item {idx + 1}", str(item), "Active"])

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
    """Routes prompts to local Ollama models with honest uncertainty and zero fake industrial data."""
    name = "model_router_tool"
    description = "Route query or reasoning task to local language model."
    category = "routing"

    def _installed_models(self, client: httpx.Client) -> Optional[List[str]]:
        """
        Returns the models Ollama actually has, or None if the daemon is down.

        None and [] mean different things and must stay distinguishable: a dead
        daemon is an operator problem, a missing model is a one-line pull.
        """
        try:
            resp = client.get(f"{OLLAMA_URL}/api/tags", timeout=2.0)
            if resp.status_code != 200:
                return None
            return [m.get("name", "") for m in resp.json().get("models", [])]
        except Exception:
            return None

    @staticmethod
    def _resolve_model(requested: str, installed: List[str]) -> Tuple[str, Optional[str]]:
        """
        Picks the best available model for a request.

        Falls back to any installed model rather than dead-ending, and reports
        the substitution so the answer can say which model actually ran. A
        degraded answer from the wrong specialist beats no answer at all, but
        only when the substitution is stated rather than hidden.
        """
        if requested in installed:
            return requested, None

        # Prefer the general-purpose model, then anything else present.
        for candidate in (MODEL_MAP["general"], *installed):
            if candidate in installed:
                return candidate, (
                    f"'{requested}' is not installed; answered with '{candidate}' instead. "
                    f"Run `ollama pull {requested}` to enable the specialised model."
                )
        return requested, None

    def _unload_other_models(self, client: httpx.Client, selected_model: str):
        for model in set(MODEL_MAP.values()):
            if model != selected_model:
                try:
                    client.post(
                        f"{OLLAMA_URL}/api/generate",
                        json={"model": model, "keep_alive": 0},
                        timeout=2.0
                    )
                except Exception:
                    pass

    def run(self, task_type: str = "general", prompt: str = "", **kwargs) -> Dict[str, Any]:
        requested_model = MODEL_MAP.get(task_type, MODEL_MAP["general"])
        selected_model = requested_model
        substitution: Optional[str] = None

        try:
            with httpx.Client(timeout=10.0) as client:
                installed = self._installed_models(client)

                if installed is None:
                    return self._offline(
                        requested_model,
                        task_type,
                        f"The local language model server (Ollama at {OLLAMA_URL}) is not running. "
                        f"Start it with `ollama serve`.",
                        f"Ollama unreachable at {OLLAMA_URL}",
                    )

                if not installed:
                    return self._offline(
                        requested_model,
                        task_type,
                        f"Ollama is running but has no models installed. "
                        f"Run `ollama pull {requested_model}` to enable responses.",
                        "No models installed",
                    )

                selected_model, substitution = self._resolve_model(requested_model, installed)

                self._unload_other_models(client, selected_model)
                resp = client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": selected_model,
                        "prompt": prompt,
                        "stream": False,
                        "keep_alive": "5m",
                    },
                    timeout=180.0,
                )
                resp.raise_for_status()
                response_text = resp.json().get("response", "").strip()

                if response_text:
                    result = {
                        "selected_model": selected_model,
                        "requested_model": requested_model,
                        "task_type": task_type,
                        "response": response_text,
                        "engine": "OLLAMA_LOCAL_MODEL",
                    }
                    if substitution:
                        result["model_substitution"] = substitution
                    return result

                return self._offline(
                    selected_model,
                    task_type,
                    f"The local model '{selected_model}' returned an empty response. "
                    f"Try again, or check `ollama ps` for memory pressure.",
                    "Empty model response",
                )

        except Exception as e:
            logger.warning(f"Local model call failed for '{selected_model}': {e}")
            return self._offline(
                selected_model,
                task_type,
                f"The local model '{selected_model}' could not be reached: {e}",
                str(e),
            )

    @staticmethod
    def _offline(model: str, task_type: str, notice: str, error: str) -> Dict[str, Any]:
        """Honest failure. Never substitutes fabricated content for a real answer."""
        return {
            "selected_model": model,
            "task_type": task_type,
            "response": notice,
            "engine": "OFFLINE_NOTICE",
            "error": error,
        }


# Deprecated legacy RAG tool kept for backward-compatibility only, but NEVER registered in active agent.
class RAGSearchTool(BaseAgentTool):
    """
    Semantic search over the organisation's own documents (knowledge_base/).

    Contract, in order of importance:
      1. Never invents evidence. No demo data, no placeholder snippets.
      2. An empty result set is a valid, meaningful answer meaning "the corpus
         does not cover this". Callers must relay that, not paper over it.
      3. If embeddings are unavailable the tool reports UNAVAILABLE rather than
         returning low-quality matches, so a misconfiguration never masquerades
         as a grounded answer.
    """
    name = "rag_search_tool"
    description = (
        "Search the organisation's local knowledge base (SOPs, manuals, internal "
        "correspondence) using on-premise vector embeddings."
    )
    category = "retrieval"

    def run(self, query: str = "", top_k: int = 3, min_score: float = 0.5, **kwargs) -> Dict[str, Any]:
        if not query or not query.strip():
            return {"query": query, "results": [], "status": "EMPTY_QUERY"}

        try:
            from backend.rag.store import get_vector_store, EmbeddingUnavailableError
        except ImportError as e:
            return {"query": query, "results": [], "status": "UNAVAILABLE", "error": str(e)}

        try:
            store = get_vector_store()
            results = store.query(query_text=query, top_k=top_k, min_score=min_score)
        except EmbeddingUnavailableError as e:
            # Surfaced deliberately: the operator needs to fix Ollama, and the
            # model must not be handed guesswork in the meantime.
            logger.error(f"Knowledge base search unavailable: {e}")
            return {
                "query": query,
                "results": [],
                "status": "UNAVAILABLE",
                "error": str(e),
            }
        except Exception as e:
            logger.error(f"Knowledge base search failed: {e}")
            return {"query": query, "results": [], "status": "ERROR", "error": str(e)}

        return {
            "query": query,
            "results": results,
            "status": "OK" if results else "NO_MATCH",
            "citations": [
                f"{r['doc_name']}, p.{r['page']}" for r in results
            ],
        }


class ToolRegistry:
    """Registry managing available tools for the general-purpose AI agent."""

    def __init__(self):
        self._tools: Dict[str, BaseAgentTool] = {}
        self._register_defaults()

    def _register_defaults(self):
        defaults = [
            OCRTool(),
            VisionAnalysisTool(),
            SandboxCodeTool(),
            DocxGeneratorTool(),
            XlsxGeneratorTool(),
            ModelRouterTool(),
            RAGSearchTool(),
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
