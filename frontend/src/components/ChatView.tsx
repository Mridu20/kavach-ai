/**
 * ChatView — the conversational transcript surface.
 *
 * Replaces the previous three-phase job form (intake -> scanning -> results),
 * which reset itself after every task and so could only ever hold one exchange.
 * Messages accumulate downward, the composer stays pinned at the bottom, and
 * the agent's tool steps collapse into the assistant message they belong to.
 *
 * Note: each message is still sent to the backend independently. Conversation
 * memory is server-side work that is not built yet, so follow-up questions do
 * not yet resolve against earlier turns.
 */

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import {
  ArrowUp,
  BookOpen,
  Bot,
  FileText,
  Info,
  Paperclip,
  Plus,
  Square,
  User,
  X,
} from "lucide-react";

import { AgentThinkingSteps } from "./AgentThinkingSteps";
import { getDeliverableDownloadUrl } from "../services/api";
import type { AgentState } from "../types/agent";
import "./markdown.css";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Original filenames shown on the user's bubble. */
  files?: string[];
  /** Populated for assistant turns; drives steps, citations and deliverables. */
  state?: AgentState;
  /**
   * Citations for a turn restored from history. Run state is per-request and
   * is not persisted, so reopened conversations keep their sources but not
   * their tool-step timeline.
   */
  storedCitations?: Array<{ doc: string; page?: number; score?: number }>;
  status: "streaming" | "done" | "error";
  error?: string;
}

interface Props {
  messages: ChatMessage[];
  isRunning: boolean;
  onSend: (query: string, files: File[]) => void;
  onStop: () => void;
  onNewChat: () => void;
}

const SUGGESTIONS = [
  {
    label: "Query the knowledge base",
    text: "What is our corrosion tolerance limit as per the SOP?",
  },
  {
    label: "General question",
    text: "Explain the difference between a process and a thread.",
  },
  {
    label: "Run code in the sandbox",
    text: "Run python: print(sum(range(101)))",
  },
];

/** Collapses repeated hits on the same document+page into one chip. */
function uniqueCitations(state?: AgentState) {
  if (!state?.retrieved_evidence?.length) return [];
  const seen = new Set<string>();
  const out: Array<{ doc: string; page?: number; score: number }> = [];
  for (const ev of state.retrieved_evidence) {
    const key = `${ev.source_doc}#${ev.page_num ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ doc: ev.source_doc, page: ev.page_num, score: ev.confidence_score });
  }
  return out;
}

const Citations: React.FC<{
  state?: AgentState;
  stored?: Array<{ doc: string; page?: number; score?: number }>;
}> = ({ state, stored }) => {
  const citations = state
    ? uniqueCitations(state)
    : (stored || []).map((c) => ({ doc: c.doc, page: c.page, score: c.score ?? 0 }));
  const kbStatus = state?.findings?.kb_status;

  // A searched-but-empty corpus is worth showing: it tells the user the answer
  // is general knowledge rather than sourced from their documents.
  if (!citations.length) {
    if (kbStatus === "NO_MATCH") {
      return (
        <div className="chat-kb-note">
          <Info size={13} />
          <span>Not found in the knowledge base — answered from general knowledge.</span>
        </div>
      );
    }
    if (kbStatus === "UNAVAILABLE") {
      return (
        <div className="chat-kb-note chat-kb-note--warn">
          <Info size={13} />
          <span>Knowledge base unavailable — answered without document grounding.</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="chat-citations">
      <span className="chat-citations__label">
        <BookOpen size={13} /> Sources
      </span>
      {citations.map((c) => (
        <span
          key={`${c.doc}-${c.page}`}
          className="chat-citation"
          title={`Relevance ${(c.score * 100).toFixed(0)}%`}
        >
          {c.doc}
          {c.page != null ? `, p.${c.page}` : ""}
        </span>
      ))}
    </div>
  );
};

const Deliverables: React.FC<{ state?: AgentState }> = ({ state }) => {
  const files = Object.values(state?.draft_deliverables || {}).filter(Boolean);
  if (!files.length) return null;

  return (
    <div className="chat-deliverables">
      {files.map((filename) => (
        <a
          key={filename}
          className="chat-deliverable"
          href={getDeliverableDownloadUrl(filename)}
          download
        >
          <FileText size={15} />
          <span>{filename}</span>
        </a>
      ))}
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage; isRunning: boolean }> = ({
  message,
  isRunning,
}) => {
  if (message.role === "user") {
    return (
      <div className="chat-turn chat-turn--user">
        <div className="chat-avatar chat-avatar--user">
          <User size={15} />
        </div>
        <div className="chat-body">
          <div className="chat-bubble chat-bubble--user">{message.content}</div>
          {!!message.files?.length && (
            <div className="chat-attachments">
              {message.files.map((f) => (
                <span key={f} className="chat-attachment">
                  <Paperclip size={12} /> {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const answer =
    message.content ||
    message.state?.text_response ||
    message.state?.findings?.synthesized_analysis ||
    "";

  return (
    <div className="chat-turn chat-turn--assistant">
      <div className="chat-avatar chat-avatar--assistant">
        <Bot size={15} />
      </div>
      <div className="chat-body">
        {message.state && (
          <AgentThinkingSteps
            state={message.state}
            isRunning={message.status === "streaming" && isRunning}
            activeQuery={message.state.user_query}
            defaultExpanded={false}
          />
        )}

        {message.status === "error" ? (
          <div className="chat-error">{message.error || "Something went wrong."}</div>
        ) : answer ? (
          <div className="markdown-body chat-answer">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{answer}</ReactMarkdown>
          </div>
        ) : message.status === "streaming" ? (
          <div className="chat-thinking">
            <span className="chat-dot" />
            <span className="chat-dot" />
            <span className="chat-dot" />
          </div>
        ) : null}

        {message.status !== "error" && (
          <>
            <Citations state={message.state} stored={message.storedCitations} />
            <Deliverables state={message.state} />
          </>
        )}
      </div>
    </div>
  );
};

export const ChatView: React.FC<Props> = ({
  messages,
  isRunning,
  onSend,
  onStop,
  onNewChat,
}) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Follow the transcript as it grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isRunning]);

  // Grow the composer with its content, up to a cap.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const canSend = input.trim().length > 0 && !isRunning;

  const submit = () => {
    if (!canSend) return;
    onSend(input.trim(), files);
    setInput("");
    setFiles([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-root">
      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-inner">
          {isEmpty ? (
            <div className="chat-empty">
              <div className="chat-empty__icon">
                <Bot size={26} />
              </div>
              <h2 className="chat-empty__title">KAVACH Sovereign Assistant</h2>
              <p className="chat-empty__sub">
                Runs entirely on this machine. Ask anything, or attach a document to analyse.
              </p>
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    className="chat-suggestion"
                    onClick={() => setInput(s.text)}
                  >
                    <span className="chat-suggestion__label">{s.label}</span>
                    <span className="chat-suggestion__text">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} isRunning={isRunning} />
            ))
          )}
        </div>
      </div>

      <div className="chat-composer-wrap">
        <div className="chat-composer">
          {!!files.length && (
            <div className="chat-pending-files">
              {files.map((f) => (
                <span key={f.name} className="chat-pending-file">
                  <Paperclip size={12} />
                  {f.name}
                  <button
                    className="chat-pending-file__remove"
                    onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="chat-composer__row">
            <button
              className="chat-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a document"
              aria-label="Attach a document"
            >
              <Paperclip size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                e.target.value = "";
              }}
            />

            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              rows={1}
              placeholder="Ask anything, or attach a document…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />

            {isRunning ? (
              <button className="chat-send chat-send--stop" onClick={onStop} title="Stop">
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                className="chat-send"
                onClick={submit}
                disabled={!canSend}
                title="Send"
                aria-label="Send"
              >
                <ArrowUp size={17} />
              </button>
            )}
          </div>
        </div>

        <div className="chat-footnote">
          {!isEmpty && (
            <button className="chat-newchat" onClick={onNewChat}>
              <Plus size={13} /> New chat
            </button>
          )}
          <span>All processing is local. No data leaves this machine.</span>
        </div>
      </div>
    </div>
  );
};
