"""
Self-Verification Engine with Auto-Revision Loop for KAVACH AI Workbench.
"""

import logging
from typing import List
from backend.agent.state import (
    AgentState,
    VerificationCheck,
    VerificationResult,
)

logger = logging.getLogger("kavach_agent.verifier")


class SelfVerifier:
    """Verifies agent findings, deliverables, citations, and zero-cloud-call security."""

    @staticmethod
    def verify(state: AgentState, max_revision_attempts: int = 2) -> VerificationResult:
        checks: List[VerificationCheck] = []
        revision_needed = False
        feedback_messages: List[str] = []

        # 1. Zero External Calls Security Audit
        cloud_leaks = [
            tc for tc in state.tool_calls
            if any(domain in str(tc.input_params).lower() or domain in str(tc.output).lower() for domain in ["openai.com", "anthropic.com", "api.cloud"])
        ]
        zero_external = len(cloud_leaks) == 0
        checks.append(
            VerificationCheck(
                check_name="ZERO_EXTERNAL_CALLS",
                passed=zero_external,
                details="0 external/cloud calls detected during execution." if zero_external else f"ALERT: Detected external network calls in {len(cloud_leaks)} tools.",
            )
        )
        if not zero_external:
            revision_needed = True
            feedback_messages.append("Security failure: External cloud endpoints detected.")

        # 2. Evidence Backing Check
        has_evidence = len(state.retrieved_evidence) > 0 or state.category.value == "GENERAL_REASONING"
        checks.append(
            VerificationCheck(
                check_name="EVIDENCE_BACKING",
                passed=has_evidence,
                details=f"Retrieved {len(state.retrieved_evidence)} supporting citations from local SOPs." if has_evidence else "Missing SOP evidence citations.",
            )
        )
        if not has_evidence and state.category.value in ["DOCUMENT_INSPECTION", "SOP_RAG_QUERY"]:
            revision_needed = True
            feedback_messages.append("Missing required SOP evidence citations for inspection finding.")

        # 3. Deliverables Output Check
        if state.category.value in ["DOCUMENT_INSPECTION", "DELIVERABLE_GENERATION"]:
            has_docx = "approval_note_docx" in state.draft_deliverables
            has_xlsx = "action_tracker_xlsx" in state.draft_deliverables
            deliverable_pass = has_docx and has_xlsx
            checks.append(
                VerificationCheck(
                    check_name="REQUIRED_DELIVERABLES",
                    passed=deliverable_pass,
                    details="DOCX Approval Note and XLSX Action Tracker successfully generated." if deliverable_pass else "Missing required DOCX or XLSX deliverable file.",
                )
            )
            if not deliverable_pass:
                revision_needed = True
                feedback_messages.append("Draft deliverables incomplete.")
        else:
            checks.append(
                VerificationCheck(
                    check_name="REQUIRED_DELIVERABLES",
                    passed=True,
                    details="No file deliverables required for this category.",
                )
            )

        # 4. Calculation & Output Integrity Check
        failed_tools = [tc for tc in state.tool_calls if not tc.success]
        no_failed_tools = len(failed_tools) == 0
        checks.append(
            VerificationCheck(
                check_name="CALCULATION_SANITY",
                passed=no_failed_tools,
                details="All tool calculations and executions completed cleanly." if no_failed_tools else f"{len(failed_tools)} tool call errors detected.",
            )
        )
        if not no_failed_tools:
            revision_needed = True
            feedback_messages.append("Tool execution errors detected.")

        current_attempt = state.verification.attempt + 1 if state.verification else 1
        all_passed = all(c.passed for c in checks)

        result = VerificationResult(
            verified=all_passed,
            checks=checks,
            feedback="; ".join(feedback_messages) if feedback_messages else "Self-verification passed cleanly.",
            revision_needed=revision_needed and (current_attempt <= max_revision_attempts),
            attempt=current_attempt,
            zero_external_calls=zero_external,
        )

        state.verification = result

        if all_passed:
            state.status = "AWAITING_APPROVAL"
            state.add_trace_event(
                event_type="VERIFICATION",
                message="Self-verification PASSED with 0 external cloud calls and full evidence backing.",
                payload={"attempt": current_attempt, "checks_passed": len(checks)},
            )
        elif result.revision_needed:
            state.status = "REVISING"
            state.add_trace_event(
                event_type="VERIFICATION",
                message=f"Self-verification failed attempt {current_attempt}. Triggering automatic revision: {result.feedback}",
                payload={"attempt": current_attempt, "feedback": result.feedback},
            )
        else:
            state.status = "VERIFICATION_FAILED"
            state.add_trace_event(
                event_type="VERIFICATION",
                message=f"Self-verification FAILED after {current_attempt} attempts: {result.feedback}",
                payload={"attempt": current_attempt, "feedback": result.feedback},
            )

        return result
