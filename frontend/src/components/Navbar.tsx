import React, { useEffect, useState } from "react";
import { ShieldCheck, Server, Search, Radio, Cpu } from "lucide-react";
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
      .then(() => {
        setToolsLoaded(true);
      })
      .catch(() => {
        setToolsLoaded(false);
      });
  }, []);

  const tabs = [
    { id: "scanner" as NavTab, label: "Analysis Scanner", icon: <Search size={16} /> },
    { id: "models" as NavTab, label: "Model Routing", icon: <Cpu size={16} /> },
    { id: "network" as NavTab, label: "Network Sovereignty", icon: <Radio size={16} /> },
  ];

  return (
    <header
      style={{
        background: "var(--bg-primary)",
        borderBottom: "1px solid var(--border-dim)",
        padding: "0 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "1560px",
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
              background: "var(--amber-500)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color="#fff" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--text-primary)",
                }}
              >
                KAVACH Sovereign AI
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-dim)",
              }}
            >
              Enterprise Demo Environment
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "none",
                background: activeTab === tab.id ? "var(--bg-raised)" : "transparent",
                color: activeTab === tab.id ? "var(--amber-500)" : "var(--text-muted)",
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "scanner" && isRunning && (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--amber-500)",
                    marginLeft: "0.25rem",
                    animation: "pulse-slow 1.5s infinite"
                  }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* ── Status Bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.75rem",
              background: "var(--bg-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: "6px",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            {toolsLoaded ? (
              <>
                <Server size={14} color="var(--green-500)" />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  System Online
                </span>
              </>
            ) : (
              <>
                <Server size={14} color="var(--red-500)" />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
