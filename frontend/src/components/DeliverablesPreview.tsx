import React, { useState } from "react";
import {
  FileText,
  Table,
  Terminal,
  Download,
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

  const queryTitle = state.user_query || "Document";
  const synthesizedAnalysis = state.findings?.synthesized_analysis || state.text_response || "";
  const structuredFindings = state.findings?.structured_findings as Array<Record<string, any>> | undefined;

  const docxFile = state.draft_deliverables?.document_docx || state.draft_deliverables?.approval_note_docx;
  const xlsxFile = state.draft_deliverables?.spreadsheet_xlsx || state.draft_deliverables?.action_tracker_xlsx;
  const sandboxOutput = state.findings?.sandbox_stdout || "";
  const hasSandbox = Boolean(state.findings?.sandbox_stdout || state.findings?.sandbox_exit_code !== undefined);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!docxFile && !xlsxFile && !hasSandbox) {
    return null;
  }

  return (
    <div className="panel" style={{ overflow: "hidden", background: "#ffffff", border: "1px solid var(--border-dim)", borderRadius: "8px" }}>
      {/* Deliverables Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.85rem 1.25rem",
          background: "#f8fafc",
          borderBottom: "1px solid var(--border-dim)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FileCheck size={16} color="var(--brand-blue)" />
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            Generated Files & Execution Outputs
          </span>
        </div>
      </div>

      {/* Compact Deliverable Action Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem", padding: "1rem 1.25rem" }}>
        {docxFile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              <FileText size={18} color="var(--brand-blue)" />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.825rem", fontWeight: 600 }}>
                {docxFile}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                className="btn btn--secondary"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => setExpandedSection(expandedSection === "docx" ? null : "docx")}
              >
                {expandedSection === "docx" ? "Hide" : "Preview"}
              </button>
              <a
                href={getDeliverableDownloadUrl(docxFile)}
                download
                className="btn btn--primary"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                <Download size={13} /> Download
              </a>
            </div>
          </div>
        )}

        {xlsxFile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              <Table size={18} color="var(--green-600)" />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.825rem", fontWeight: 600 }}>
                {xlsxFile}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                className="btn btn--secondary"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => setExpandedSection(expandedSection === "xlsx" ? null : "xlsx")}
              >
                {expandedSection === "xlsx" ? "Hide" : "Preview"}
              </button>
              <a
                href={getDeliverableDownloadUrl(xlsxFile)}
                download
                className="btn btn--primary"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                <Download size={13} /> Download
              </a>
            </div>
          </div>
        )}

        {hasSandbox && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              background: "#fdf4ff",
              border: "1px solid #f0abfc",
              borderRadius: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              <Terminal size={18} color="#9333ea" />
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.825rem", fontWeight: 600 }}>
                Sandbox Output
              </div>
            </div>
            <button
              className="btn btn--secondary"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
              onClick={() => setExpandedSection(expandedSection === "code" ? null : "code")}
            >
              {expandedSection === "code" ? "Hide" : "View Console"}
            </button>
          </div>
        )}
      </div>

      {/* Inline Previews */}
      {expandedSection && (
        <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
          {expandedSection === "docx" && (
            <div style={{ background: "#ffffff", border: "1px solid var(--border-dim)", borderRadius: "6px", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>{queryTitle}</h3>
              <div style={{ fontSize: "0.875rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {synthesizedAnalysis || "No preview text available."}
              </div>
            </div>
          )}

          {expandedSection === "xlsx" && (
            <div style={{ background: "#ffffff", border: "1px solid var(--border-dim)", borderRadius: "6px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-dim)" }}>
                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "left" }}>Item</th>
                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "left" }}>Details</th>
                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "left" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {structuredFindings && structuredFindings.length > 0 ? (
                    structuredFindings.map((f, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <td style={{ padding: "0.6rem 0.85rem", fontWeight: 600 }}>{f.item_id || `Item ${i + 1}`}</td>
                        <td style={{ padding: "0.6rem 0.85rem" }}>{f.description || JSON.stringify(f)}</td>
                        <td style={{ padding: "0.6rem 0.85rem", color: "var(--brand-blue)" }}>{f.severity || "Active"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ padding: "0.6rem 0.85rem" }}>1</td>
                      <td style={{ padding: "0.6rem 0.85rem" }}>{queryTitle}</td>
                      <td style={{ padding: "0.6rem 0.85rem", color: "var(--green-600)" }}>Completed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {expandedSection === "code" && (
            <div style={{ background: "#0f172a", color: "#e2e8f0", borderRadius: "6px", padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.825rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", borderBottom: "1px solid #334155", paddingBottom: "0.3rem" }}>
                <span style={{ color: "#94a3b8" }}>Execution Console (Exit Code: {state.findings?.sandbox_exit_code ?? 0})</span>
                <button
                  onClick={() => copyToClipboard(sandboxOutput || "")}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                >
                  {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                  <span style={{ fontSize: "0.75rem" }}>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {sandboxOutput || "Execution completed with no standard output."}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
