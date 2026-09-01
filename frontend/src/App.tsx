import { useState } from "react";
import { Navbar, type NavTab } from "./components/Navbar";
import { ScanWorkbench } from "./components/ScanWorkbench";
import { NetworkMonitor } from "./components/NetworkMonitor";
import { ModelMatrix } from "./components/ModelMatrix";
import type { AgentState, HumanDecision } from "./types/agent";
import { runAgentWorkflow, submitHumanApproval } from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("scanner");
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleRunTask = async (query: string, files: string[]) => {
    setIsRunning(true);
    setError(null);
    showToast("Analyzing document...");
    try {
      const state = await runAgentWorkflow(query, files);
      setAgentState(state);
      showToast("Analysis Complete.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Backend unreachable. Ensure the server is running on port 8000.";
      setError(msg);
      showToast("Analysis failed. Check backend connection.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitApproval = async (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, unknown>
  ) => {
    if (!agentState) return;
    try {
      const updated = await submitHumanApproval(
        agentState.task_id,
        decision,
        reviewer,
        comments,
        modifications
      );
      setAgentState(updated);
      showToast(`Decision recorded: ${decision}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Approval submission failed.";
      showToast(msg);
    }
  };

  const handleReset = () => {
    setAgentState(null);
    setError(null);
  };

  return (
    <div className="app-root">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isRunning={isRunning} />

      <main className="main-content">
        {activeTab === "scanner" && (
          <ScanWorkbench
            state={agentState}
            isRunning={isRunning}
            error={error}
            onRunTask={handleRunTask}
            onSubmitApproval={handleSubmitApproval}
            onReset={handleReset}
          />
        )}
        {activeTab === "models" && <ModelMatrix />}
        {activeTab === "network" && <NetworkMonitor />}
      </main>

      {toast && (
        <div className="toast">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
