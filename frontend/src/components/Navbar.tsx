import React, { useEffect, useState } from "react";
import { ShieldCheck, Wifi, WifiOff, Activity, User, LogOut } from "lucide-react";
import { fetchAvailableTools } from "../services/api";
import type { UserProfile } from "../types/auth";

export type NavTab = "scanner" | "network";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isRunning: boolean;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [toolsLoaded, setToolsLoaded] = useState(false);

  useEffect(() => {
    fetchAvailableTools()
      .then(() => setToolsLoaded(true))
      .catch(() => setToolsLoaded(false));
  }, []);

  const tabs = [
    { id: "scanner" as NavTab, label: "Sovereign Assistant" },
    { id: "network" as NavTab, label: "Air-Gap Network Audit" },
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.2)",
              border: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color="#ffffff" />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1.15rem",
                color: "#0f172a",
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-sans)",
                lineHeight: 1.1,
              }}
            >
              KAVACH AI
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 500,
                marginTop: "1px",
              }}
            >
              Your data. Your hardware. Your AI.
            </span>
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
                {tab.label}
                {tab.id === "scanner" && isRunning && (
                  <Activity size={14} color="var(--brand-blue)" style={{ animation: "spin 1.5s linear infinite" }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── User Profile & System Status Bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <div
            title={toolsLoaded ? "System Online" : "System Offline"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.45rem 0.65rem",
              background: toolsLoaded ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${toolsLoaded ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: "6px",
              color: toolsLoaded ? "var(--green-600)" : "var(--red-500)",
            }}
          >
            {toolsLoaded ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>

          {user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.25rem 0.5rem 0.25rem 0.75rem",
                background: "var(--bg-raised)",
                border: "1px solid var(--border-base)",
                borderRadius: "6px",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--brand-navy)", lineHeight: 1.2 }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--brand-blue)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {user.employeeId}
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "4px",
                  background: "#ffffff",
                  border: "1px solid var(--border-dim)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn--primary"
              style={{ padding: "0.45rem 1rem", fontSize: "0.825rem" }}
            >
              <User size={14} />
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};



