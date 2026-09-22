import { useState, useEffect, useRef } from "react";
import { Navbar, type NavTab } from "./components/Navbar";
import { ChatView, type ChatMessage } from "./components/ChatView";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { NetworkMonitor } from "./components/NetworkMonitor";
import { SignInView } from "./components/SignInView";
import { UserManagement } from "./components/UserManagement";
import type { AgentState } from "./types/agent";
import {
  runAgentWorkflowStream,
  cancelAgentWorkflow,
  uploadFile,
  fetchConversations,
  fetchConversation,
  deleteConversation,
  fetchMe,
  logout as apiLogout,
  type ConversationSummary,
  type AuthUser,
} from "./services/api";
import "./components/chat.css";

let messageCounter = 0;
const nextId = () => `m_${Date.now()}_${messageCounter++}`;

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("scanner");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Identifies the assistant turn currently being streamed into.
  const activeAssistantIdRef = useRef<string | null>(null);

  // Session. Resolved against the backend on mount: a token in storage is a
  // claim, not proof, so it is verified rather than trusted.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setSessionChecked(true));
  }, []);

  // Conversation history
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Read inside async callbacks, where the state value would be stale.
  const conversationIdRef = useRef<string | null>(null);

  const refreshConversations = async () => {
    try {
      setConversations(await fetchConversations());
    } catch {
      // History is a convenience; a failed list must not disrupt chatting.
    }
  };

  useEffect(() => {
    if (user) refreshConversations();
  }, [user]);

  const handleSelectConversation = async (id: string) => {
    if (isRunning) return;
    try {
      const conversation = await fetchConversation(id);
      setMessages(
        conversation.messages.map((m) => ({
          id: `stored_${m.id}`,
          role: m.role,
          content: m.content,
          status: "done" as const,
          // Restored turns show citations but not the tool steps: the run
          // state is per-request and is not persisted.
          storedCitations: m.citations ?? undefined,
        }))
      );
      setConversationId(id);
      conversationIdRef.current = id;
    } catch {
      showToast("Could not open that conversation.");
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (conversationIdRef.current === id) {
        setMessages([]);
        setConversationId(null);
        conversationIdRef.current = null;
      }
      await refreshConversations();
      showToast("Conversation deleted.");
    } catch {
      showToast("Could not delete that conversation.");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSignedIn = (signedIn: AuthUser) => {
    setUser(signedIn);
    refreshConversations();
    showToast(`Signed in as ${signedIn.full_name}`);
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    // Clear in-memory history too: the next person at this machine must not
    // see the previous user's transcript still on screen.
    setMessages([]);
    setConversations([]);
    setConversationId(null);
    conversationIdRef.current = null;
  };

  /** Updates one assistant turn in place as stream events arrive. */
  const patchMessage = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleSend = async (query: string, files: File[]) => {
    const userMessage: ChatMessage = {
      id: nextId(),
      role: "user",
      content: query,
      files: files.map((f) => f.name),
      status: "done",
    };
    const assistantId = nextId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    activeAssistantIdRef.current = assistantId;
    setIsRunning(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const uploaded = await Promise.all(files.map((f) => uploadFile(f)));
      const savedPaths = uploaded.map((u) => u.saved_path);

      const state = await runAgentWorkflowStream(
        query,
        savedPaths,
        // Step-level progress: the plan and tool statuses fill in live.
        (partialState: AgentState) => {
          // The backend creates the conversation on the first turn and returns
          // its id; capture it so subsequent turns continue the same thread.
          if (partialState.conversation_id && !conversationIdRef.current) {
            conversationIdRef.current = partialState.conversation_id;
            setConversationId(partialState.conversation_id);
          }
          patchMessage(assistantId, { state: partialState });
        },
        controller.signal,
        conversationIdRef.current
      );

      if (state.conversation_id) {
        conversationIdRef.current = state.conversation_id;
        setConversationId(state.conversation_id);
      }

      patchMessage(assistantId, {
        state,
        content: state.text_response || state.findings?.synthesized_analysis || "",
        status: "done",
      });
      refreshConversations();
    } catch (err) {
      if (controller.signal.aborted) {
        patchMessage(assistantId, { status: "done" });
        showToast("Generation stopped.");
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Backend unreachable. Ensure the server is running on port 8000.";
        patchMessage(assistantId, { status: "error", error: msg });
        showToast("Request failed. Check the backend connection.");
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      activeAssistantIdRef.current = null;
    }
  };

  const handleStopTask = async () => {
    const assistantId = activeAssistantIdRef.current;
    const taskId = assistantId
      ? messages.find((m) => m.id === assistantId)?.state?.task_id
      : undefined;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (taskId) {
      try {
        const cancelled = await cancelAgentWorkflow(taskId);
        if (assistantId) patchMessage(assistantId, { state: cancelled, status: "done" });
      } catch {
        // Task had already finished or was never registered; nothing to cancel.
      }
    }
    setIsRunning(false);
    showToast("Generation stopped.");
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    conversationIdRef.current = null;
  };

  const isChat = activeTab === "scanner";

  // Avoid flashing the sign-in screen while the stored token is being verified.
  if (!sessionChecked) {
    return <div className="auth-screen" />;
  }

  if (!user) {
    return <SignInView onSignedIn={handleSignedIn} />;
  }

  return (
    <div className={`app-root${isChat ? " app-root--chat" : ""}`}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={isRunning}
        user={user}
        onOpenAuth={() => setShowUsers(true)}
        onLogout={handleLogout}
      />

      <main className={`main-content${isChat ? " main-content--chat" : ""}`}>
        {isChat && (
          <div className="chat-layout">
            <ConversationSidebar
              conversations={conversations}
              activeId={conversationId}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
              onSelect={handleSelectConversation}
              onNew={handleNewChat}
              onDelete={handleDeleteConversation}
            />
            <ChatView
              messages={messages}
              isRunning={isRunning}
              onSend={handleSend}
              onStop={handleStopTask}
              onNewChat={handleNewChat}
            />
          </div>
        )}
        {activeTab === "network" && <NetworkMonitor />}
      </main>

      {/* Administrators can create and remove accounts. */}
      {showUsers && user.role === "admin" && (
        <UserManagement currentUser={user} onClose={() => setShowUsers(false)} />
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

