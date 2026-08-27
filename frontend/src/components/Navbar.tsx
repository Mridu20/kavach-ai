import React from "react";
import {
  ShieldCheck,
  Cpu,
  Radio,
  FileCode,
  Eye,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";

export type NavTab = "workbench" | "multimodal" | "models" | "airgap" | "knowledge";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
}) => {
  return (
    <header
      style={{
        background: "linear-gradient(180deg, #090f20 0%, #060a17 100%)",
        borderBottom: "1px solid #1e293b",
        padding: "0.85rem 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1600px",
          margin: "0 auto",
        }}
      >
        {/* Brand & Sovereignty Emblem */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  letterSpacing: "0.05em",
                  color: "#ffffff",
                  background: "linear-gradient(90deg, #ffffff 0%, #93c5fd 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                KAVACH AI
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                }}
              >
                v1.0 SOVEREIGN WORKBENCH
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>On-Premise Industrial Agentic Intelligence</span>
              <span style={{ color: "#334155" }}>•</span>
              <span style={{ color: "#10b981", fontWeight: 600 }}>PSU / Refinery Grade</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={() => setActiveTab("workbench")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                activeTab === "workbench"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "transparent",
              color: activeTab === "workbench" ? "#34d399" : "#94a3b8",
              border:
                activeTab === "workbench"
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : "1px solid transparent",
            }}
          >
            <Layers size={16} />
            <span>Agent Studio</span>
            {isRunning && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  display: "inline-block",
                  animation: "pulse-slow 1.5s infinite",
                }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab("multimodal")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                activeTab === "multimodal"
                  ? "rgba(6, 182, 212, 0.15)"
                  : "transparent",
              color: activeTab === "multimodal" ? "#38bdf8" : "#94a3b8",
              border:
                activeTab === "multimodal"
                  ? "1px solid rgba(6, 182, 212, 0.4)"
                  : "1px solid transparent",
            }}
          >
            <Eye size={16} />
            <span>OCR & P&ID Lab</span>
          </button>

          <button
            onClick={() => setActiveTab("models")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                activeTab === "models"
                  ? "rgba(139, 92, 246, 0.15)"
                  : "transparent",
              color: activeTab === "models" ? "#a78bfa" : "#94a3b8",
              border:
                activeTab === "models"
                  ? "1px solid rgba(139, 92, 246, 0.4)"
                  : "1px solid transparent",
            }}
          >
            <Sparkles size={16} />
            <span>Model Router</span>
          </button>

          <button
            onClick={() => setActiveTab("airgap")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                activeTab === "airgap"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "transparent",
              color: activeTab === "airgap" ? "#34d399" : "#94a3b8",
              border:
                activeTab === "airgap"
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : "1px solid transparent",
            }}
          >
            <Radio size={16} />
            <span>Air-Gap Radar</span>
          </button>

          <button
            onClick={() => setActiveTab("knowledge")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                activeTab === "knowledge"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "transparent",
              color: activeTab === "knowledge" ? "#fbbf24" : "#94a3b8",
              border:
                activeTab === "knowledge"
                  ? "1px solid rgba(245, 158, 11, 0.4)"
                  : "1px solid transparent",
            }}
          >
            <Database size={16} />
            <span>Knowledge Vault</span>
          </button>
        </nav>

        {/* Live Hardware Telemetry */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Air-Gap Status Indicator */}
          <div className="badge-sovereign">
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <span>AIR-GAPPED // 0 EGRESS</span>
          </div>

          {/* Local GPU Telemetry */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.3rem 0.65rem",
              background: "#0c1322",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "#94a3b8",
            }}
          >
            <Cpu size={14} color="#38bdf8" />
            <span style={{ color: "#f1f5f9" }}>NVIDIA RTX-4090</span>
            <span style={{ color: "#34d399", fontWeight: 700 }}>21.4 / 24 GB</span>
          </div>
        </div>
      </div>
    </header>
  );
};
