import React, { useEffect, useState } from "react";
import { ShieldCheck, Server, Search, Radio, Cpu, Activity } from "lucide-react";
import { fetchAvailableTools } from "../services/api";

export type NavTab = "scanner" | "network" | "models";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isRunning }) => {
  const [toolsLoaded, setToolsLoaded] = useState(false);

  useEffect(() => {
    fetchAvailableTools()
      .then(() => setToolsLoaded(true))
      .catch(() => setToolsLoaded(false));
  }, []);

  const tabs = [
    { id: "scanner" as NavTab, label: "Analysis Workbench", icon: <Search size={16} /> },
    { id: "models" as NavTab, label: "Model Routing Matrix", icon: <Cpu size={16} /> },
    { id: "network" as NavTab, label: "Air-Gap Network Audit", icon: <Radio size={16} /> },
  ];

  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid var(--border-dim)",
        padding: "0 2rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1600px",
          margin: "0 auto",
          height: "64px",
          gap: "1.5rem",
        }}
      >
        {/* ── Brand ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexShrink: 0 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "var(--brand-navy)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "var(--brand-navy)",
                  letterSpacing: "-0.01em",
                }}
              >
                KAVACH AI
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  background: "#f0f9ff",
                  color: "var(--brand-blue)",
                  border: "1px solid #bae6fd",
                }}
              >
                SOVEREIGN WORKBENCH
              </span>
            </div>
            <div
              style={{
                fontSize: "0.725rem",
                color: "var(--text-dim)",
              }}
            >
              Statutory Inspection & Air-Gapped AI Audit
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <nav style={{ display: "flex", gap: "0.35rem" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: isActive ? "var(--border-base)" : "transparent",
                  background: isActive ? "var(--bg-raised)" : "transparent",
                  color: isActive ? "var(--brand-navy)" : "var(--text-muted)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out",
                }}
              >
                {React.cloneElement(tab.icon, {
                  color: isActive ? "var(--brand-blue)" : "currentColor",
                })}
                {tab.label}
                {tab.id === "scanner" && isRunning && (
                  <Activity size={14} color="var(--brand-blue)" style={{ animation: "spin 1.5s linear infinite" }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Status Pill ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.35rem 0.75rem",
              background: toolsLoaded ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${toolsLoaded ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: toolsLoaded ? "var(--green-600)" : "var(--red-500)",
            }}
          >
            <Server size={14} />
            <span>{toolsLoaded ? "Sovereign Engine Active" : "Backend Offline"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

