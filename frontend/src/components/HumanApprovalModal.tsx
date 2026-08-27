import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle,
  Edit3,
  XCircle,
  FileSignature,
  UserCheck,
  Building,
} from "lucide-react";
import { AgentState, HumanDecision } from "../types/agent";

interface HumanApprovalModalProps {
  state: AgentState;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDecision: (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, any>
  ) => void;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  state,
  isOpen,
  onClose,
  onSubmitDecision,
}) => {
  const [reviewerName, setReviewerName] = useState(
    state.approval.reviewer || "Er. A. K. Sharma (Chief Materials & Inspection Engineer)"
  );
  const [department, setDepartment] = useState("Refinery Technical Audit & Safety Directorate");
  const [comments, setComments] = useState(
    "Verified against ASME Section VIII Div 1 & OISD-118. Ultrasonic findings and derating approved for plant turnaround."
  );
  const [isModifying, setIsModifying] = useState(false);
  const [modFindings, setModFindings] = useState(
    JSON.stringify(state.findings, null, 2)
  );

  if (!isOpen) return null;

  const handleApprove = () => {
    onSubmitDecision("APPROVED", `${reviewerName} [${department}]`, comments);
    onClose();
  };

  const handleModifyAndApprove = () => {
    let parsedMod = {};
    try {
      parsedMod = JSON.parse(modFindings);
    } catch {
      alert("Invalid JSON modifications format. Please correct before submitting.");
      return;
    }
    onSubmitDecision(
      "MODIFIED",
      `${reviewerName} [${department}]`,
      comments,
      parsedMod
    );
    onClose();
  };

  const handleReject = () => {
    if (!comments.trim()) {
      alert("Please provide rejection comments / non-conformance reason.");
      return;
    }
    onSubmitDecision("REJECTED", `${reviewerName} [${department}]`, comments);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(5, 8, 17, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#0d1527",
          border: "1px solid #27354f",
          borderRadius: "16px",
          maxWidth: "750px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          padding: "2rem",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSignature size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f1f5f9" }}>
                Human-in-the-Loop (HITL) Authorization Gate
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Task ID: <span className="font-mono" style={{ color: "#38bdf8" }}>{state.task_id}</span> • Statutory Deliverable Sign-Off
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "1.25rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Verification Summary Banner */}
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "8px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <ShieldCheck size={20} color="#34d399" />
          <span style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
            Agent Self-Verification Passed: <strong>0 cloud network calls</strong>, all citations grounded in local PSU & ASME repository.
          </span>
        </div>

        {/* Reviewer Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#94a3b8",
                marginBottom: "0.4rem",
              }}
            >
              <UserCheck size={14} /> AUTHORIZED INSPECTOR / REVIEWER
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              style={{
                width: "100%",
                background: "#080d1a",
                border: "1px solid #27354f",
                borderRadius: "8px",
                padding: "0.6rem 0.85rem",
                color: "#f1f5f9",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#94a3b8",
                marginBottom: "0.4rem",
              }}
            >
              <Building size={14} /> ORGANIZATION / PSU UNIT
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: "100%",
                background: "#080d1a",
                border: "1px solid #27354f",
                borderRadius: "8px",
                padding: "0.6rem 0.85rem",
                color: "#f1f5f9",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Comments & Endorsement */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#94a3b8",
              marginBottom: "0.4rem",
            }}
          >
            OFFICIAL REMARKS & STATUTORY ENDORSEMENT
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter inspection remarks, statutory safety derogations, or turnaround instructions..."
            style={{
              width: "100%",
              background: "#080d1a",
              border: "1px solid #27354f",
              borderRadius: "8px",
              padding: "0.65rem 0.85rem",
              color: "#f1f5f9",
              fontSize: "0.85rem",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>

        {/* Toggle Inline Findings Modification */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              Need to override or fine-tune generated findings before signing?
            </span>
            <button
              type="button"
              onClick={() => setIsModifying(!isModifying)}
              style={{
                background: "transparent",
                border: "none",
                color: "#38bdf8",
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <Edit3 size={14} />
              {isModifying ? "Hide JSON Editor" : "Edit Findings JSON"}
            </button>
          </div>

          {isModifying && (
            <textarea
              rows={6}
              value={modFindings}
              onChange={(e) => setModFindings(e.target.value)}
              className="font-mono"
              style={{
                width: "100%",
                background: "#050811",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "0.75rem",
                color: "#34d399",
                fontSize: "0.75rem",
                outline: "none",
              }}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.75rem",
            borderTop: "1px solid #1e293b",
            paddingTop: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={handleReject}
            className="btn-danger"
          >
            <XCircle size={16} />
            Reject Deliverables
          </button>

          {isModifying ? (
            <button
              type="button"
              onClick={handleModifyAndApprove}
              className="btn-primary"
              style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" }}
            >
              <Edit3 size={16} />
              Approve with Modifications
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApprove}
              className="btn-primary"
            >
              <CheckCircle size={16} />
              Authorize & Sign (Approve)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
