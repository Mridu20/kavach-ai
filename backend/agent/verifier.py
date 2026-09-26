"""
Self-Verification Engine for General-Purpose AI Agent.
Verifies response completion, zero unauthorized external cloud calls, and execution integrity.
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
    """Verifies agent response generation, tool execution sanity, and local air-gapped security."""

    @staticmethod
    def verify(state: AgentState, max_revision_attempts: int = 1) -> VerificationResult:
        checks: List[VerificationCheck] = []
        revision_needed = False
        feedback_messages: List[str] = []

        # 1. Zero External Calls Security Audit
        cloud_leaks = [
            tc for tc in state.tool_calls
            if any(domain in str(tc.input_params).lower() or domain in str(tc.output).lower()
                   for domain in ["openai.com", "anthropic.com", "api.cloud"])
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

        # 2. Response Generation Check
        has_response = bool(state.text_response and state.text_response.strip())
        checks.append(
            VerificationCheck(
                check_name="RESPONSE_COMPLETION",
                passed=has_response,
                details="Response generated successfully." if has_response else "No response generated.",
            )
        )
        if not has_response:
            revision_needed = True
            feedback_messages.append("Missing response output.")

        # 3. Tool Execution Integrity Check
        failed_tools = [tc for tc in state.tool_calls if not tc.success]
        no_failed_tools = len(failed_tools) == 0
        checks.append(
            VerificationCheck(
                check_name="TOOL_SANITY",
                passed=no_failed_tools,
                details="All tool executions completed cleanly." if no_failed_tools else f"{len(failed_tools)} tool call errors detected.",
            )
        )
        if not no_failed_tools:
            # Note tool errors but only trigger revision if no response was produced
            if not has_response:
                revision_needed = True
                feedback_messages.append("Tool execution errors prevented response generation.")

        current_attempt = state.verification.attempt + 1 if state.verification else 1
        all_passed = all(c.passed for c in checks)

        result = VerificationResult(
            verified=all_passed,
            checks=checks,
            feedback="; ".join(feedback_messages) if feedback_messages else "Verification passed cleanly.",
            revision_needed=revision_needed and (current_attempt <= max_revision_attempts),
            attempt=current_attempt,
            zero_external_calls=zero_external,
        )

        state.verification = result

        if all_passed:
            state.status = "COMPLETED"
            state.add_trace_event(
                event_type="VERIFICATION",
                message="Verification PASSED with local execution verified.",
                payload={"attempt": current_attempt, "checks_passed": len(checks)},
            )
        elif result.revision_needed:
            state.status = "REVISING"
            state.add_trace_event(
                event_type="VERIFICATION",
                message=f"Verification failed attempt {current_attempt}: {result.feedback}",
                payload={"attempt": current_attempt, "feedback": result.feedback},
            )
        else:
            state.status = "VERIFICATION_FAILED"
            state.add_trace_event(
                event_type="VERIFICATION",
                message=f"Verification finished with notices: {result.feedback}",
                payload={"attempt": current_attempt, "feedback": result.feedback},
            )

        return result
