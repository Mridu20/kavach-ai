import React from "react";
import { activeModelsList } from "../services/api";
import { Cpu, CheckCircle2, RotateCw, Activity, Zap, FileText } from "lucide-react";

export const ModelMatrix: React.FC = () => {
  const routingRules = [
    {
      task: "Engineering Code & Python Sandbox",
      routedModel: "Qwen2.5-Coder-7B-Instruct (Q4_K_M)",
      hardware: "GPU (5.5 GB VRAM)",
      rationale: "Optimized for deterministic Python AST generation, math stress formulas & syntax execution without external API dependencies.",
      latencyMs: 140,
    },
    {
      task: "Document OCR & Scanned Inspection Extraction",
      routedModel: "Tesseract OCR v5 (CPU Engine)",
      hardware: "CPU (0 GB VRAM)",
      rationale: "Fast, zero-VRAM on-premise CPU optical character recognition for scanned reports, tabular inspection sheets & image fallbacks.",
      latencyMs: 45,
    },
    {
      task: "Multimodal P&ID & Defect Scans",
      routedModel: "Qwen2.5-VL-7B (Q4_K_M)",
      hardware: "GPU (6.0 GB VRAM)",
      rationale: "Equipped with high-resolution vision patch encoders for technical schematics, weld radiographs & scanned engineering drawings.",
      latencyMs: 280,
    },
    {
      task: "Statutory Approval Note Synthesis & Reasoning",
      routedModel: "Qwen2.5-7B-Instruct (Q4_K_M)",
      hardware: "GPU (5.5 GB VRAM)",
      rationale: "Executive formatting, SOP compliance checks, and PSU bureaucratic synthesis with strict grounding in local RAG standards.",
      latencyMs: 190,
    },
  ];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--brand-navy)", marginBottom: "0.4rem" }}>
          Autonomous Model Routing Matrix
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          The sovereign orchestration engine auto-routes tasks to optimal local models based on task domain, context length, and GPU VRAM constraints.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "1.25rem" }}>
        {activeModelsList.map((model) => (
          <div key={model.id} className="panel" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "#ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.2rem" }}>
                  {model.name}
                </h3>
                <span style={{ fontSize: "0.775rem", color: "var(--brand-blue)", fontWeight: 600 }}>
                  {model.specialization}
                </span>
              </div>
              <div
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.725rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: model.status === "ACTIVE" ? "#f0fdf4" : model.status === "ROUTED" ? "#f0f9ff" : "#f1f5f9",
                  color: model.status === "ACTIVE" ? "var(--green-600)" : model.status === "ROUTED" ? "var(--brand-blue)" : "var(--text-muted)",
                  border: `1px solid ${model.status === "ACTIVE" ? "#bbf7d0" : model.status === "ROUTED" ? "#bae6fd" : "var(--border-dim)"}`
                }}
              >
                {model.status === "ACTIVE" ? <CheckCircle2 size={13} /> : model.status === "ROUTED" ? <RotateCw size={13} /> : <Activity size={13} />}
                {model.status}
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              {model.description}
            </p>

            <div style={{ marginTop: "auto", display: "flex", gap: "1rem", borderTop: "1px solid var(--border-dim)", paddingTop: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                {model.vramUsageGb > 0 ? (
                  <>
                    <Cpu size={14} color="var(--brand-blue)" />
                    <span>{model.vramUsageGb} GB Dedicated VRAM</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} color="var(--green-600)" />
                    <span style={{ color: "var(--green-600)", fontWeight: 600 }}>CPU Engine (0 GB VRAM)</span>
                  </>
                )}
              </div>
              <div style={{ width: "1px", background: "var(--border-dim)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Quantization / Engine:</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{model.weightsFormat}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Routing Logic Matrix Table */}
      <div className="panel" style={{ overflow: "hidden", background: "#ffffff" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-dim)", background: "#f8fafc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Zap size={16} color="var(--brand-blue)" />
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            Automated Task Routing Decision Table
          </h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-dim)", background: "#f1f5f9", color: "var(--text-secondary)" }}>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Task Requirement</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Auto-Routed Model / Engine</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Compute Tier</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Routing Rationale</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Avg. Latency</th>
              </tr>
            </thead>
            <tbody>
              {routingRules.map((rule, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid var(--border-dim)",
                    background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                  }}
                >
                  <td style={{ padding: "0.75rem 1.25rem", fontWeight: 600, color: "var(--brand-navy)" }}>
                    {rule.task}
                  </td>
                  <td style={{ padding: "0.75rem 1.25rem", fontFamily: "var(--font-mono)", color: "var(--brand-blue)", fontWeight: 600 }}>
                    {rule.routedModel}
                  </td>
                  <td style={{ padding: "0.75rem 1.25rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        background: rule.hardware.includes("CPU") ? "#f0fdf4" : "#f0f9ff",
                        color: rule.hardware.includes("CPU") ? "var(--green-600)" : "var(--brand-blue)",
                        border: `1px solid ${rule.hardware.includes("CPU") ? "#bbf7d0" : "#bae6fd"}`,
                        fontWeight: 600,
                        fontSize: "0.725rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {rule.hardware}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1.25rem", color: "var(--text-secondary)" }}>
                    {rule.rationale}
                  </td>
                  <td style={{ padding: "0.75rem 1.25rem", fontFamily: "var(--font-mono)", color: "var(--green-600)", fontWeight: 600 }}>
                    ~{rule.latencyMs} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

