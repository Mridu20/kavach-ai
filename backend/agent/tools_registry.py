"""
Tool Registry, Tool Selection Hub, and Retry Mechanism for KAVACH AI Workbench.
"""

import time
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional
from backend.agent.state import ToolCallRecord

logger = logging.getLogger("kavach_agent.tools")


class BaseAgentTool(ABC):
    """Abstract Base Class for all KAVACH AI agent tools."""
    name: str
    description: str
    category: str

    @abstractmethod
    def run(self, **kwargs) -> Dict[str, Any]:
        """Execute tool logic and return dictionary result."""
        pass


class MockOCRTool(BaseAgentTool):
    name = "ocr_pdf_tool"
    description = "Extract text, tables, and handwriting from scanned PDF documents locally."
    category = "document"

    def run(self, file_path: str = "", pages: Optional[List[int]] = None, **kwargs) -> Dict[str, Any]:
        return {
            "file_path": file_path,
            "extracted_text": f"[MOCK OCR OUTPUT] Extracted 4 pages from {file_path}. Document contains technical inspection findings.",
            "pages_processed": pages or [1, 2, 3, 4],
            "tables_found": 2,
            "handwriting_detected": True,
        }


class MockRAGSearchTool(BaseAgentTool):
    name = "rag_search_tool"
    description = "Search local SOPs, manuals, and correspondence using vector embeddings."
    category = "retrieval"

    def run(self, query: str = "", top_k: int = 3, **kwargs) -> Dict[str, Any]:
        return {
            "query": query,
            "results": [
                {
                    "doc_name": "SOP_Industrial_Safety_v3.pdf",
                    "page": 14,
                    "score": 0.92,
                    "snippet": "Section 4.2: Pressure vessel inspection must mandate immediate shutdown if corrosion exceeds 0.5mm.",
                },
                {
                    "doc_name": "Maintenance_Manual_Turbine_2025.pdf",
                    "page": 8,
                    "score": 0.87,
                    "snippet": "Section 2.1: Secondary containment seal replacement required every 12 months.",
                },
            ],
        }


class MockVisionTool(BaseAgentTool):
    name = "vision_analysis_tool"
    description = "Analyze photographs and visual diagram components using local vision-language model."
    category = "vision"

    def run(self, image_path: str = "", prompt: str = "", **kwargs) -> Dict[str, Any]:
        return {
            "image_path": image_path,
            "analysis": "[MOCK VISION OUTPUT] Identified surface cracks near weld joint B-12. Risk level: HIGH.",
            "confidence": 0.94,
            "detected_objects": ["weld_joint", "surface_crack", "corrosion_spot"],
        }


class MockSandboxCodeTool(BaseAgentTool):
    name = "sandbox_code_tool"
    description = "Execute python or shell script safely in isolated Docker sandbox without network access."
    category = "sandbox"

    def run(self, code: str = "", language: str = "python", **kwargs) -> Dict[str, Any]:
        return {
            "language": language,
            "stdout": "[SANDBOX STDOUT] Execution completed cleanly with 0 cloud calls.",
            "stderr": "",
            "exit_code": 0,
            "network_calls_blocked": 0,
        }


class MockDocxGeneratorTool(BaseAgentTool):
    name = "generate_docx_tool"
    description = "Generate official Approval Note DOCX document from structured findings."
    category = "generator"

    def run(self, title: str = "", findings: Optional[Dict[str, Any]] = None, output_path: str = "Approval_Note.docx", **kwargs) -> Dict[str, Any]:
        return {
            "output_path": output_path,
            "status": "CREATED",
            "file_size_kb": 42.5,
            "sections_generated": ["Header", "Executive Summary", "SOP Verification", "Recommendation"],
        }


class MockXlsxGeneratorTool(BaseAgentTool):
    name = "generate_xlsx_tool"
    description = "Generate Action Tracker XLSX spreadsheet from inspection tasks."
    category = "generator"

    def run(self, items: Optional[List[Dict[str, Any]]] = None, output_path: str = "Action_Tracker.xlsx", **kwargs) -> Dict[str, Any]:
        return {
            "output_path": output_path,
            "status": "CREATED",
            "file_size_kb": 18.2,
            "rows_written": len(items or []),
        }


class MockModelRouterTool(BaseAgentTool):
    name = "model_router_tool"
    description = "Route task to specialized local model (coding, vision, general reasoning)."
    category = "routing"

    def run(self, task_type: str = "general", prompt: str = "", **kwargs) -> Dict[str, Any]:
        selected_model = "llama3-8b-instruct-q4"
        if task_type == "vision":
            selected_model = "llava-v1.6-7b-q4"
        elif task_type == "coding":
            selected_model = "qwen2.5-coder-7b-q4"

        return {
            "selected_model": selected_model,
            "task_type": task_type,
            "response": f"[MOCK MODEL RESPONSE via {selected_model}] Completed reasoning for prompt.",
        }


class ToolRegistry:
    """Registry managing available tools and execution retries."""

    def __init__(self):
        self._tools: Dict[str, BaseAgentTool] = {}
        self._register_defaults()

    def _register_defaults(self):
        defaults = [
            MockOCRTool(),
            MockRAGSearchTool(),
            MockVisionTool(),
            MockSandboxCodeTool(),
            MockDocxGeneratorTool(),
            MockXlsxGeneratorTool(),
            MockModelRouterTool(),
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
