import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  X,
  ScanLine,
  CheckCircle2,
  FileSignature,
  RotateCcw,
  Loader2,
  ClipboardList,
  AlertTriangle,
  Zap,
  Cpu,
  ShieldCheck,
  Lock,
  BookOpen,
} from "lucide-react";
import type { AgentState, HumanDecision } from "../types/agent";
import { DeliverablesPreview } from "./DeliverablesPreview";
import { AgentThinkingSteps } from "./AgentThinkingSteps";
import { sampleIndustrialScenarios } from "../services/api";

interface Props {
  state: AgentState | null;
  isRunning: boolean;
  error: string | null;
  onRunTask: (query: string, files: File[]) => void;
  onSubmitApproval: (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, unknown>
  ) => void;
  onReset: () => void;
}

// ── Phase 1: Document Intake ─────────────────────────────────────────────────

const IntakeZone: React.FC<{
  files: File[];
  query: string;
  isUploading: boolean;
  onFilesChange: (f: File[]) => void;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
}> = ({ files, query, isUploading, onFilesChange, onQueryChange, onSubmit }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    onFilesChange([...files, ...Array.from(incoming)]);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [files]
  );

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const handleSelectScenario = (sc: (typeof sampleIndustrialScenarios)[0]) => {
    onQueryChange(sc.query);
  };

  const canSubmit = files.length > 0 && query.trim().length > 10 && !isUploading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Demo Scenarios Selection */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--brand-navy)" }}>
            <Zap size={16} color="var(--brand-blue)" />
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Industrial Scenarios</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
          {sampleIndustrialScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc)}
              style={{
                textAlign: "left",
                padding: "0.85rem 1rem",
                background: query === sc.query ? "#f0f9ff" : "var(--bg-raised)",
                border: "1px solid",
                borderColor: query === sc.query ? "#bae6fd" : "var(--border-dim)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {sc.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* File Dropzone */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--brand-navy)", marginBottom: "0.85rem" }}>
          Document & Asset Intake
        </div>

        <div
          className={`scan-dropzone ${dragging ? "drag-over" : ""} ${files.length > 0 ? "has-file" : ""}`}
          style={{ minHeight: "180px", cursor: "pointer" }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {files.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem 1.5rem",
                gap: "0.75rem",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UploadCloud size={24} color="var(--brand-blue)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                  Click or drag inspection files here
                </p>
                <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Supports PDF reports, scanned images, and CSV maintenance logs
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>
                {files.length} file{files.length > 1 ? "s" : ""} selected for ingestion:
              </div>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    padding: "0.55rem 0.85rem",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText size={16} color="var(--brand-blue)" />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </span>
                  <button
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "2px",
                    }}
                    onClick={() => removeFile(i)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Audit Instructions */}
      <div className="panel" style={{ padding: "1.25rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.9rem",
            color: "var(--brand-navy)",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Audit Directives & Inspection Scope
        </label>
        <textarea
          className="input-base"
          rows={3}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Describe inspection goals, statutory standard references (e.g. ASME / OISD), and key metrics..."
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button
            className="btn btn--primary"
            disabled={!canSubmit}
            onClick={onSubmit}
            style={{ padding: "0.65rem 1.75rem", fontSize: "0.875rem" }}
          >
            <ScanLine size={16} />
            {isUploading ? "Uploading Files..." : "Run Sovereign Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── Phase 2: Scanning in Progress ────────────────────────────────────────────

// ── Phase 2: Scanning in Progress ────────────────────────────────────────────

const ScanningPhase: React.FC<{ files: File[]; query: string; state: AgentState | null; isRunning: boolean }> = ({
  files,
  query,
  state,
  isRunning,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Live ChatGPT & Antigravity Style Agent Thinking Steps */}
      <AgentThinkingSteps state={state} isRunning={isRunning} activeQuery={query} defaultExpanded={true} />

      <div className="panel" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--brand-navy)", marginBottom: "0.5rem" }}>
          Ingestion Files & Query Context
        </div>
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            fontSize: "0.825rem",
            color: "var(--text-primary)",
            marginBottom: "0.75rem",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>Instruction: </span>
          <span style={{ fontStyle: "italic" }}>"{query}"</span>
        </div>

        {files.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#ffffff",
                  border: "1px solid var(--border-base)",
                  borderRadius: "4px",
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.75rem",
                  color: "var(--text-primary)",
                }}
              >
                <FileText size={14} color="var(--brand-blue)" />
                <span>{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Phase 3: Results ──────────────────────────────────────────────────────────

const ResultsPhase: React.FC<{
  state: AgentState;
  onReset: () => void;
  onSubmitApproval: Props["onSubmitApproval"];
}> = ({ state, onReset, onSubmitApproval }) => {
  const findingsEntries = Object.entries(state.findings || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  // Derive model name from actual state findings
  const modelUsed = state.findings?.model_used || "Qwen2.5-7B-Instruct (Q4_K_M)";
  let activeModel = modelUsed;
  if (state.category === "SANDBOX_CODE_EXECUTION") {
    activeModel = state.findings?.model_used || "Qwen2.5-Coder-7B-Instruct (Q4_K_M)";
  } else if (state.category === "DOCUMENT_INSPECTION") {
    activeModel = state.findings?.model_used || "Qwen2.5-VL-7B (Q4_K_M)";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Summary Header Bar ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} color="var(--green-600)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--brand-navy)" }}>
              Autonomous Inspection Audit Completed
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.2rem",
              }}
            >
              <span>Task ID: <code style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{state.task_id}</code></span>
              <span>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Cpu size={14} color="var(--brand-blue)" />
                Auto-Routed Model: <strong style={{ color: "var(--text-primary)" }}>{activeModel}</strong>
              </span>
            </div>
          </div>
        </div>

        <button className="btn btn--secondary" onClick={onReset}>
          <RotateCcw size={15} />
          Start New Inspection
        </button>
      </div>

      {/* ── Collapsible Agent Thinking & Execution Steps Trace ── */}
      <AgentThinkingSteps state={state} isRunning={false} defaultExpanded={false} />

      {/* ── Executive Metric Stat Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Verification Status
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: state.verification?.verified ? "var(--green-600)" : "var(--amber-500)" }}>
            {state.verification?.verified ? "VERIFIED" : "PENDING"}
          </div>
        </div>

        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            SOP Evidence Citations
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            {state.retrieved_evidence?.length ?? 0} Citations
          </div>
        </div>

        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Network Security
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: state.verification?.zero_external_calls ? "var(--green-600)" : "var(--red-500)" }}>
            {state.verification?.zero_external_calls ? "0 External Calls" : "External Calls Detected"}
          </div>
        </div>

        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Governance Gate
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: state.status === "COMPLETED" ? "var(--green-600)" : state.status === "REJECTED" ? "var(--red-500)" : "var(--amber-500)" }}>
            {state.status === "COMPLETED" ? "Approved" : state.status === "REJECTED" ? "Rejected" : "Awaiting Approval"}
          </div>
        </div>
      </div>


      {/* ── Key Findings Grid ── */}
      {findingsEntries.length > 0 && (
        <div className="panel" style={{ padding: "1.25rem 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <ClipboardList size={18} color="var(--brand-blue)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
              Ingested Metrics & Extracted Observations
            </h3>
          </div>
          <div className="findings-grid">
            {findingsEntries
              .filter(([, v]) => typeof v !== "object" || v === null)
              .map(([key, val]) => (
                <div key={key} className="finding-cell">
                  <div className="finding-cell__label">
                    {key.replace(/_/g, " ").toUpperCase()}
                  </div>
                  <div className="finding-cell__value">
                    {typeof val === "boolean"
                      ? val
                        ? "Yes"
                        : "No"
                      : typeof val === "number"
                      ? val.toLocaleString()
                      : String(val).length > 80
                      ? String(val).slice(0, 80) + "..."
                      : String(val)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Generated Deliverables ── */}
      <DeliverablesPreview state={state} />

      {/* ── Governance Approval Footer ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#ffffff",
        }}
      >
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            Human-in-the-Loop Statutory Sign-off
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Review generated memorandum and action register to confirm clearance status.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn--danger" onClick={() => onSubmitApproval("REJECTED", "Inspector")}>
            Reject Audit
          </button>
          <button className="btn btn--primary" onClick={() => onSubmitApproval("APPROVED", "Inspector")}>
            <FileSignature size={16} />
            Approve & Authorize Clearance
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Root Workbench ────────────────────────────────────────────────────────────

export const ScanWorkbench: React.FC<Props> = ({
  state,
  isRunning,
  error,
  onRunTask,
  onSubmitApproval,
  onReset,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    setIsUploading(true);
    try {
      await onRunTask(query, files);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setQuery("");
    onReset();
  };

  // Phase determination
  const phase: "intake" | "scanning" | "results" = state ? "results" : isRunning ? "scanning" : "intake";

  return (
    <div style={{ width: "100%" }}>
      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
          }}
        >
          <AlertTriangle size={18} color="var(--red-500)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--red-500)", marginBottom: "0.2rem" }}>
              Backend Communication Error
            </p>
            <p style={{ fontSize: "0.825rem", color: "var(--text-primary)" }}>{error}</p>
          </div>
          <button className="btn btn--secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }} onClick={handleReset}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Phases */}
      {phase === "intake" && (
        <IntakeZone
          files={files}
          query={query}
          isUploading={isUploading}
          onFilesChange={setFiles}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
        />
      )}

      {phase === "scanning" && (
        <ScanningPhase files={files} query={query} state={state} isRunning={isRunning} />
      )}

      {phase === "results" && state && (
        <ResultsPhase state={state} onReset={handleReset} onSubmitApproval={onSubmitApproval} />
      )}
    </div>
  );
};

