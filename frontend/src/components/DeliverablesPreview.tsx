import React, { useState } from "react";
import {
  FileText,
  Table,
  Terminal,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Copy,
  Check,
} from "lucide-react";
import { AgentState } from "../types/agent";
import { getDeliverableDownloadUrl } from "../services/api";

interface DeliverablesPreviewProps {
  state: AgentState;
}

export const DeliverablesPreview: React.FC<DeliverablesPreviewProps> = ({ state }) => {
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"docx" | "xlsx" | "code" | null>(null);

  // Dynamic data
  const synthesizedAnalysis = state.findings?.synthesized_analysis || "";
  const ocrFinding = state.findings?.ocr_extracted_text || state.findings?.vision_analysis || "";
  const structuredFindings = state.findings?.structured_findings as Array<{ item_id?: string; description?: string; severity?: string; location?: string }> | undefined;

  const actionItems = structuredFindings && structuredFindings.length > 0
    ? structuredFindings.map((f, idx) => ({
        id: f.item_id || `ACT-0${idx + 1}`,
        component: f.location || "Inspected Equipment",
        action: f.description || "Perform NDT testing",
        priority: f.severity || "HIGH",
        standard: "ASME Sec VIII / OISD-118",
        owner: "Lead Engineer",
        deadline: "Immediate",
        status: "SCHEDULED",
      }))
    : [{
        id: "ACT-01",
        component: state.user_query || "Target Asset",
        action: ocrFinding.slice(0, 80) || "Review findings",
        priority: "HIGH",
        standard: "ASME Sec VIII / OISD-118",
        owner: "Chief Inspection Engineer",
        deadline: "Within 48 Hours",
        status: "SCHEDULED",
      }];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check which deliverables are actually present
  const hasDocx = Boolean(state.draft_deliverables?.approval_note_docx);
  const hasXlsx = Boolean(state.draft_deliverables?.action_tracker_xlsx);
  const hasSandbox = Boolean(state.findings?.sandbox_stdout || state.findings?.sandbox_exit_code !== undefined);

  if (!hasDocx && !hasXlsx && !hasSandbox) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Section Label */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--brand-navy)" }}>
        <FileCheck size={14} color="var(--brand-blue)" />
        <span>Attachments</span>
      </div>

      {/* Compact Download Row */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {/* DOCX Row */}
        {hasDocx && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.85rem",
              background: "var(--bg-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
            }}
          >
            <FileText size={16} color="var(--brand-blue)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--brand-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Approval Note (DOCX)
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {state.draft_deliverables.approval_note_docx}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
              <a
                href={getDeliverableDownloadUrl(state.draft_deliverables.approval_note_docx)}
                download
                className="btn btn--primary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem", textDecoration: "none" }}
              >
                <Download size={13} /> Download
              </a>
              <button
                onClick={() => setExpandedSection(expandedSection === "docx" ? null : "docx")}
                className="btn btn--secondary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem" }}
              >
                {expandedSection === "docx" ? "Hide" : "Preview"}
              </button>
            </div>
          </div>
        )}

        {/* XLSX Row */}
        {hasXlsx && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.85rem",
              background: "var(--bg-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
            }}
          >
            <Table size={16} color="var(--green-600)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--brand-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Action Tracker (XLSX)
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {state.draft_deliverables.action_tracker_xlsx}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
              <a
                href={getDeliverableDownloadUrl(state.draft_deliverables.action_tracker_xlsx)}
                download
                className="btn btn--primary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem", textDecoration: "none", background: "var(--green-600)" }}
              >
                <Download size={13} /> Download
              </a>
              <button
                onClick={() => setExpandedSection(expandedSection === "xlsx" ? null : "xlsx")}
                className="btn btn--secondary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem" }}
              >
                {expandedSection === "xlsx" ? "Hide" : "Preview"}
              </button>
            </div>
          </div>
        )}

        {/* Sandbox Row */}
        {hasSandbox && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6rem 0.85rem",
              background: "var(--bg-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
            }}
          >
            <Terminal size={16} color="var(--brand-indigo)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--brand-navy)" }}>
                Sandbox output
              </div>
              {state.findings?.sandbox_exit_code !== undefined && (
                <div style={{ fontSize: "0.7rem", color: state.findings.sandbox_exit_code === 0 ? "var(--green-600)" : "var(--red-500)", fontFamily: "var(--font-mono)" }}>
                  Exit code: {state.findings.sandbox_exit_code}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
              <button
                onClick={() => copyToClipboard(state.findings?.sandbox_stdout || "")}
                className="btn btn--secondary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem" }}
              >
                {copied ? <Check size={13} color="var(--green-600)" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => setExpandedSection(expandedSection === "code" ? null : "code")}
                className="btn btn--primary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.7rem", background: "var(--brand-indigo)" }}
              >
                {expandedSection === "code" ? "Hide" : "View"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Preview Area */}
      {expandedSection && (
        <div style={{ background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--border-dim)", padding: "0.85rem", maxHeight: "500px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
            <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--brand-navy)" }}>
              {expandedSection === "docx" && "Document Preview"}
              {expandedSection === "xlsx" && "Spreadsheet Preview"}
              {expandedSection === "code" && "Console Output"}
            </span>
            <button
              onClick={() => setExpandedSection(null)}
              className="btn btn--secondary"
              style={{ padding: "0.2rem 0.45rem", fontSize: "0.675rem" }}
            >
              Close
            </button>
          </div>

          {/* DOCX Preview — renders actual synthesized content */}
          {expandedSection === "docx" && (
            <div
              style={{
                background: "#ffffff",
                color: "#0f172a",
                padding: "2rem 2.5rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontFamily: "'Times New Roman', Times, serif",
                lineHeight: "1.6",
              }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "0.85rem", marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
                  Inspection Approval Note
                </h2>
                <p style={{ fontSize: "0.8rem", fontStyle: "italic", margin: 0, color: "#334155", marginTop: "0.2rem" }}>
                  Generated by KAVACH AI — Ref: KVH-{state.task_id.slice(-6).toUpperCase()}
                </p>
              </div>

              {/* Meta */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  fontFamily: "sans-serif",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "4px",
                  marginBottom: "1.25rem",
                }}
              >
                <div><strong>REF:</strong> KVH-INSP-2026-{state.task_id.slice(-6).toUpperCase()}</div>
                <div><strong>DATE:</strong> {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                <div><strong>SUBJECT:</strong> {state.user_query || "Inspection Audit"}</div>
                <div><strong>METHOD:</strong> AI-assisted analysis</div>
              </div>

              {/* Executive Summary — from actual data */}
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", borderBottom: "1px solid #cbd5e1", paddingBottom: "0.15rem", marginTop: "0.85rem" }}>
                1. FINDINGS
              </h4>
              {synthesizedAnalysis ? (
                <p style={{ fontSize: "0.825rem", marginTop: "0.4rem", whiteSpace: "pre-wrap" }}>
                  {synthesizedAnalysis}
                </p>
              ) : ocrFinding ? (
                <p style={{ fontSize: "0.825rem", marginTop: "0.4rem" }}>
                  Extracted content: <em>"{ocrFinding}"</em>
                </p>
              ) : (
                <p style={{ fontSize: "0.825rem", marginTop: "0.4rem", color: "#64748b", fontStyle: "italic" }}>
                  Preview unavailable — download the file to view full content.
                </p>
              )}

              {/* Structured findings list */}
              {structuredFindings && structuredFindings.length > 0 && (
                <>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", borderBottom: "1px solid #cbd5e1", paddingBottom: "0.15rem", marginTop: "0.85rem" }}>
                    2. STRUCTURED FINDINGS
                  </h4>
                  <ul style={{ fontSize: "0.825rem", paddingLeft: "1.5rem", marginTop: "0.4rem" }}>
                    {structuredFindings.map((f, idx) => (
                      <li key={idx}>
                        <strong>{f.item_id || `Finding ${idx + 1}`}:</strong> {f.description}
                        {f.severity && <> — Severity: <strong>{f.severity}</strong></>}
                        {f.location && <> — Location: {f.location}</>}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Approval status */}
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px dashed #94a3b8",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  fontFamily: "sans-serif",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.725rem", color: "#64748b" }}>Status:</div>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      background: state.approval.status === "APPROVED" ? "#dcfce7" : "#fef3c7",
                      color: state.approval.status === "APPROVED" ? "#15803d" : "#b45309",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      marginTop: "0.15rem",
                    }}
                  >
                    {state.approval.status}
                  </div>
                </div>
                {state.approval.reviewer && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                      {state.approval.reviewer}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#475569" }}>
                      Reviewing Authority
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* XLSX Preview */}
          {expandedSection === "xlsx" && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                  textAlign: "left",
                  background: "#ffffff",
                  borderRadius: "6px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>ID</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Asset</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Action</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Priority</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Standard</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Owner</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Deadline</th>
                    <th style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <td style={{ padding: "0.55rem 0.75rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--brand-blue)" }}>{item.id}</td>
                      <td style={{ padding: "0.55rem 0.75rem", fontWeight: 600, color: "#0f172a" }}>{item.component}</td>
                      <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>{item.action}</td>
                      <td style={{ padding: "0.55rem 0.75rem" }}>
                        <span
                          style={{
                            padding: "0.1rem 0.35rem",
                            borderRadius: "3px",
                            fontSize: "0.675rem",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            background: item.priority === "CRITICAL" ? "#fef2f2" : item.priority === "HIGH" ? "#fef3c7" : "#f0f9ff",
                            color: item.priority === "CRITICAL" ? "#dc2626" : item.priority === "HIGH" ? "#d97706" : "#0284c7",
                            border: `1px solid ${item.priority === "CRITICAL" ? "#fecaca" : item.priority === "HIGH" ? "#fde68a" : "#bae6fd"}`,
                          }}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ padding: "0.55rem 0.75rem", fontFamily: "var(--font-mono)", color: "#475569", fontSize: "0.75rem" }}>{item.standard}</td>
                      <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>{item.owner}</td>
                      <td style={{ padding: "0.55rem 0.75rem", color: "#64748b" }}>{item.deadline}</td>
                      <td style={{ padding: "0.55rem 0.75rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.725rem", fontWeight: 600, color: "var(--green-600)" }}>
                          <CheckCircle2 size={12} /> {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sandbox Code Console */}
          {expandedSection === "code" && (
            <div>
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "5px",
                  padding: "1rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  color: "#38bdf8",
                  overflowX: "auto",
                  lineHeight: "1.5",
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  <code>{state.findings?.sandbox_stdout || "No output captured."}</code>
                </pre>
              </div>

              {state.findings?.sandbox_exit_code !== undefined && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    background: state.findings.sandbox_exit_code === 0 ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${state.findings.sandbox_exit_code === 0 ? "#bbf7d0" : "#fecaca"}`,
                    borderRadius: "5px",
                    padding: "0.5rem 0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: state.findings.sandbox_exit_code === 0 ? "var(--green-600)" : "var(--red-500)",
                  }}
                >
                  Exit code: {state.findings.sandbox_exit_code}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
