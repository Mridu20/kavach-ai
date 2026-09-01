import React from "react";
import { activeModelsList } from "../services/api";
import { Cpu, CheckCircle2, RotateCw, Activity } from "lucide-react";

export const ModelMatrix: React.FC = () => {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", marginTop: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 600, fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Active Model Roster
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          The orchestration engine auto-routes tasks to the optimal local model based on specialization and VRAM availability.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))", gap: "1.25rem" }}>
        {activeModelsList.map((model) => (
          <div key={model.id} className="panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  {model.name}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--amber-500)", fontWeight: 500 }}>
                  {model.specialization}
                </span>
              </div>
              <div
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "99px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: model.status === "ACTIVE" ? "rgba(16, 185, 129, 0.1)" : model.status === "ROUTED" ? "rgba(59, 130, 246, 0.1)" : "rgba(100, 116, 139, 0.1)",
                  color: model.status === "ACTIVE" ? "var(--green-500)" : model.status === "ROUTED" ? "#3b82f6" : "var(--text-dim)",
                  border: `1px solid ${model.status === "ACTIVE" ? "rgba(16, 185, 129, 0.3)" : model.status === "ROUTED" ? "rgba(59, 130, 246, 0.3)" : "var(--border-base)"}`
                }}
              >
                {model.status === "ACTIVE" ? <CheckCircle2 size={12} /> : model.status === "ROUTED" ? <RotateCw size={12} /> : <Activity size={12} />}
                {model.status}
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {model.description}
            </p>

            <div style={{ marginTop: "auto", display: "flex", gap: "1rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
                <Cpu size={14} />
                <span>{model.vramUsageGb} GB VRAM</span>
              </div>
              <div style={{ width: "1px", background: "var(--border-dim)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 600 }}>Fmt:</span>
                <span>{model.weightsFormat}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
