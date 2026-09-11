import { useState, useEffect } from "react";
import { Navbar, type NavTab } from "./components/Navbar";
import { ScanWorkbench } from "./components/ScanWorkbench";
import { NetworkMonitor } from "./components/NetworkMonitor";
import { ModelMatrix } from "./components/ModelMatrix";
import { AuthView, sampleUsers } from "./components/AuthView";
import type { AgentState, HumanDecision } from "./types/agent";
import type { UserProfile } from "./types/auth";
import { runAgentWorkflow, submitHumanApproval, uploadFile } from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("scanner");
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("kavach_user");
    if (saved) {
      try { return JSON.parse(saved); } catch { return sampleUsers[0]; }
    }
    return sampleUsers[0]; // Pre-authenticated with Lead Inspector for effortless demoing
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("kavach_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("kavach_user");
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleAuthSuccess = (loggedUser: UserProfile) => {
    setUser(loggedUser);
    setShowAuthModal(false);
    showToast(`Authenticated as ${loggedUser.fullName} (${loggedUser.employeeId})`);
  };

  const handleLogout = () => {
    setUser(null);
    showToast("Signed out from Sovereign Session.");
  };

  const handleRunTask = async (query: string, files: File[]) => {
    setIsRunning(true);
    setError(null);
    showToast("Analyzing document with sovereign agent...");
    try {
      const uploaded = await Promise.all(files.map((f) => uploadFile(f)));
      const savedPaths = uploaded.map((u) => u.saved_path);
      const state = await runAgentWorkflow(query, savedPaths);
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
      const activeReviewer = user ? `${user.fullName} (${user.employeeId})` : reviewer;
      const updated = await submitHumanApproval(
        agentState.task_id,
        decision,
        activeReviewer,
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
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

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

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthView
          isModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {toast && (
        <div className="toast">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;

