import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  X,
  Send,
  RotateCcw,
  Square,
  AlertTriangle,
  ArrowRight,
  Wifi,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import './markdown.css';
import type { AgentState, HumanDecision } from "../types/agent";
import { DeliverablesPreview } from "./DeliverablesPreview";
import { AgentThinkingSteps } from "./AgentThinkingSteps";
import { sampleScenarios } from "../services/api";

interface Props {
  state: AgentState | null;
  isRunning: boolean;
  error: string | null;
  onRunTask: (query: string, files: File[]) => void;
  onSubmitApproval?: (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, unknown>
  ) => void;
  onReset: () => void;
  onStopTask?: () => void;
  onNavigateToNetwork?: () => void;
}

export const ScanWorkbench: React.FC<Props> = ({
  state,
  isRunning,
  error,
  onRunTask,
  onReset,
  onStopTask,
  onNavigateToNetwork,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [activeQueryPrompt, setActiveQueryPrompt] = useState("");
  const [activeFilesList, setActiveFilesList] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
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
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectScenario = (sc: (typeof sampleScenarios)[0]) => {
    setQuery(sc.query);
  };

  const handleSubmit = async () => {
    if (!query.trim() || isRunning) return;
    setIsUploading(true);
    setActiveQueryPrompt(query);
    setActiveFilesList([...files]);
    try {
      await onRunTask(query, files);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleResetAll = () => {
    setFiles([]);
    setQuery("");
    setActiveQueryPrompt("");
    setActiveFilesList([]);
    onReset();
  };

  const activeModel = state?.findings?.model_used || "Qwen2.5-7B-Instruct (Q4_K_M)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* ── Status Header Bar ── */}
      <div
        className="panel"
        style={{
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: "#ffffff",
          border: "1px solid var(--border-dim)",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={16} color="var(--brand-blue)" />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            KAVACH AI — On-Premise General Assistant
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            • Local LLM & OCR • Air-Gapped
          </span>
        </div>

        {onNavigateToNetwork && (
          <button
            onClick={onNavigateToNetwork}
            className="btn btn--secondary"
            style={{
              fontSize: "0.775rem",
              padding: "0.35rem 0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              borderColor: "#bbf7d0",
              background: "#f0fdf4",
              color: "var(--green-600)",
              fontWeight: 600,
            }}
          >
            <Wifi size={14} />
            <span>Network Monitor</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
          }}
        >
          <AlertTriangle size={18} color="var(--red-500)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--red-500)", marginBottom: "0.2rem" }}>
              Notice
            </p>
            <p style={{ fontSize: "0.825rem", color: "var(--text-primary)" }}>{error}</p>
          </div>
          <button className="btn btn--secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }} onClick={handleResetAll}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Welcome Area & Scenario Starters ── */}
      {!state && !isRunning && (
        <div className="panel" style={{ padding: "2rem", background: "#ffffff", borderRadius: "10px", border: "1px solid var(--border-dim)" }}>
          <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 2rem auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-navy)", marginBottom: "0.5rem" }}>
              How can I help you today?
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Ask a question, request code execution, or attach documents to summarize and analyze.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
            {sampleScenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                style={{
                  textAlign: "left",
                  padding: "1rem",
                  background: query === sc.query ? "#f0f9ff" : "var(--bg-raised)",
                  border: "1px solid",
                  borderColor: query === sc.query ? "#bae6fd" : "var(--border-dim)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.35rem" }}>
                  {sc.title}
                </div>
                <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>
                  {sc.query}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Conversation Stream (Prompt + Live Agent Response) ── */}
      {(activeQueryPrompt || state || isRunning) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* User Prompt Message Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              background: "#ffffff",
              border: "1px solid var(--border-dim)",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                User Query
              </span>
              <button
                onClick={handleResetAll}
                className="btn btn--secondary"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.725rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <RotateCcw size={12} /> New conversation
              </button>
            </div>

            <div style={{ fontSize: "0.95rem", color: "var(--brand-navy)", fontWeight: 600, lineHeight: 1.5 }}>
              "{activeQueryPrompt || state?.user_query}"
            </div>

            {/* Attached file badges */}
            {(activeFilesList.length > 0 || (state?.input_files && state.input_files.length > 0)) && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                {(activeFilesList.length > 0 ? activeFilesList.map((f) => f.name) : state?.input_files || []).map((name, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: "6px",
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.75rem",
                      color: "var(--brand-blue)",
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={14} />
                    <span>{name.split("/").pop()?.split("\\").pop()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reasoning & Execution Trace Timeline */}
          <AgentThinkingSteps
            state={state}
            isRunning={isRunning}
            activeQuery={activeQueryPrompt || state?.user_query}
          />

          {/* Agent Response Card */}
          {state && (state.text_response || state.findings?.synthesized_analysis) && (
            <div
              className="panel"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                padding: "1.5rem",
                background: "#ffffff",
                border: "1px solid var(--border-dim)",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                  Response
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Model: <strong style={{ color: "var(--brand-navy)" }}>{activeModel}</strong>
                </span>
              </div>

              {/* Written Answer */}
              <div
                className="markdown-body"
                style={{
                  fontSize: "0.925rem",
                  color: "#1e293b",
                  lineHeight: 1.7,
                  background: "#f8fafc",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                }}
              >
                <ReactMarkdown children={state.text_response || state.findings?.synthesized_analysis || ""} rehypePlugins={[rehypeHighlight]} />
              </div>

              {/* Deliverables / Execution Artifacts if any were generated */}
              <DeliverablesPreview state={state} />
            </div>
          )}
        </div>
      )}

      {/* ── Single Unified Chat Input Box ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem",
          background: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          border: "1px solid var(--border-base)",
          borderRadius: "10px",
        }}
      >
        {/* File Dropzone & Chips Strip */}
        <div style={{ marginBottom: "0.85rem" }}>
          {files.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Attached:</span>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                  }}
                >
                  <FileText size={14} color="var(--brand-blue)" />
                  <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "1px", display: "flex" }}
                  >
                    <X size={13} color="var(--text-muted)" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => inputRef.current?.click()}
                className="btn btn--secondary"
                style={{ padding: "0.25rem 0.55rem", fontSize: "0.7rem" }}
              >
                + Add More
              </button>
            </div>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: "1px dashed",
                borderColor: dragging ? "var(--brand-blue)" : "var(--border-dim)",
                borderRadius: "6px",
                padding: "0.6rem 1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                color: "var(--text-muted)",
                fontSize: "0.775rem",
                background: dragging ? "#f0f9ff" : "transparent",
              }}
            >
              <UploadCloud size={16} color="var(--brand-blue)" />
              <span>Attach documents or images for analysis (optional)</span>
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

        {/* Textarea Input + Action Controls */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <textarea
            className="input-base"
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder="Ask a question or describe a task... (Press Enter to Send)"
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              lineHeight: 1.4,
            }}
          />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isRunning ? (
              onStopTask && (
                <button
                  className="btn btn--danger"
                  onClick={onStopTask}
                  style={{ padding: "0.75rem 1.25rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Square size={14} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )
            ) : (
              <button
                className="btn btn--primary"
                disabled={!query.trim() || isUploading}
                onClick={handleSubmit}
                style={{ padding: "0.75rem 1.5rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Send size={15} />
                <span>{isUploading ? "Uploading..." : "Send"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
