"""
Human-in-the-Loop (HITL) Approval State Manager for KAVACH AI Workbench.
"""

from datetime import datetime, timezone
import logging
from typing import Dict, Optional
from backend.agent.state import AgentState, HumanApprovalState, HumanDecision

logger = logging.getLogger("kavach_agent.human_approval")


class HumanApprovalManager:
    """Manages human review, modifications, and final approval gate transitions."""

    @staticmethod
    def submit_decision(
        state: AgentState,
        decision: HumanDecision,
        reviewer: str = "Authorized Inspector",
        comments: Optional[str] = None,
        modifications: Optional[Dict[str, any]] = None,
    ) -> AgentState:

        if state.status not in ["AWAITING_APPROVAL", "VERIFYING", "COMPLETED"]:
            logger.warning(f"Task {state.task_id} is in status '{state.status}'. Approval submitted.")

        now_str = datetime.now(timezone.utc).isoformat()

        approval_state = HumanApprovalState(
            status=decision,
            reviewer=reviewer,
            comments=comments or "",
            modifications=modifications or {},
            timestamp=now_str,
        )

        state.approval = approval_state
        state.updated_at = now_str

        if decision == HumanDecision.APPROVED:
            state.status = "COMPLETED"
            state.add_trace_event(
                event_type="DECISION",
                message=f"Task APPROVED by '{reviewer}'. Final deliverables ready.",
                payload={"reviewer": reviewer, "comments": comments},
            )

        elif decision == HumanDecision.MODIFIED:
            if modifications:
                # Apply human modifications to findings
                state.findings["human_modifications"] = modifications
                state.findings.update(modifications)

            state.status = "COMPLETED"
            state.add_trace_event(
                event_type="DECISION",
                message=f"Task APPROVED WITH MODIFICATIONS by '{reviewer}'.",
                payload={"reviewer": reviewer, "modifications": modifications, "comments": comments},
            )

        elif decision == HumanDecision.REJECTED:
            state.status = "REJECTED"
            state.add_trace_event(
                event_type="DECISION",
                message=f"Task REJECTED by '{reviewer}': {comments or 'No reason provided.'}",
                payload={"reviewer": reviewer, "comments": comments},
            )

        state.trace.end_time = now_str
        return state
