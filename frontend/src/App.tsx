import { useState, useEffect } from "react";
import { Navbar, type NavTab } from "./components/Navbar";
import { WorkbenchCanvas } from "./components/WorkbenchCanvas";
import { MultimodalInspector } from "./components/MultimodalInspector";
import { ModelRouterMatrix } from "./components/ModelRouterMatrix";
import { AirGapMonitor } from "./components/AirGapMonitor";
import { KnowledgeVault } from "./components/KnowledgeVault";
import type { AgentState, HumanDecision } from "./types/agent";
import {
  runAgentWorkflow,
  submitHumanApproval,
  sampleIndustrialScenarios,
} from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("workbench");
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const defaultState = await runAgentWorkflow(
        sampleIndustrialScenarios[0].query,
        sampleIndustrialScenarios[0].files
      );
      setAgentState(defaultState);
    };
    init();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRunTask = async (query: string, files: string[]) => {
    setIsRunning(true);
    showToast("Launching sovereign agent state machine...");
    try {
      const state = await runAgentWorkflow(query, files);
      setAgentState(state);
      showToast("Agent execution completed with 0 external calls!");
    } catch (err) {
      console.error(err);
      showToast("Error running agent workflow.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitApproval = async (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, any>
  ) => {
    if (!agentState) return;
    try {
      const updatedState = await submitHumanApproval(
        agentState.task_id,
        decision,
        reviewer,
        comments,
        modifications
      );
      setAgentState(updatedState);
      showToast(`Deliverables officially signed: ${decision}`);
    } catch (err) {
      console.error(err);
      showToast("Error submitting human approval.");
    }
  };

  return (
    <div className="app-container">
      {/* Sovereign Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === "workbench" && (
          <WorkbenchCanvas
            state={agentState}
            isRunning={isRunning}
            onRunTask={handleRunTask}
            onSubmitApproval={handleSubmitApproval}
          />
        )}

        {activeTab === "multimodal" && <MultimodalInspector />}

        {activeTab === "models" && <ModelRouterMatrix />}

        {activeTab === "airgap" && <AirGapMonitor />}

        {activeTab === "knowledge" && <KnowledgeVault />}
      </main>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0d1527",
            border: "1px solid #10b981",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
            color: "#ffffff",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            zIndex: 200,
            animation: "pulse-slow 2s infinite",
          }}
        >
          <span style={{ color: "#34d399" }}>🛡️</span>
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}

export default App;
