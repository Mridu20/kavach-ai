/**
 * ConversationSidebar — past conversations, newest first.
 *
 * Reads from the server-side SQLite store rather than browser storage, so
 * history survives a cache clear and is auditable on the host machine.
 */

import React, { useState } from "react";
import { MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";

import type { ConversationSummary } from "../services/api";

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/** Renders an ISO timestamp as a short relative label. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const ConversationSidebar: React.FC<Props> = ({
  conversations,
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onNew,
  onDelete,
}) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed">
        <button className="sidebar__icon-btn" onClick={onToggleCollapsed} title="Show conversations">
          <PanelLeftOpen size={17} />
        </button>
        <button className="sidebar__icon-btn" onClick={onNew} title="New chat">
          <Plus size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Conversations</span>
        <button className="sidebar__icon-btn" onClick={onToggleCollapsed} title="Hide conversations">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <button className="sidebar__new" onClick={onNew}>
        <Plus size={15} /> New chat
      </button>

      <div className="sidebar__list">
        {conversations.length === 0 ? (
          <p className="sidebar__empty">
            No conversations yet. Your history is stored locally on this machine.
          </p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`sidebar__item${c.id === activeId ? " sidebar__item--active" : ""}`}
              onClick={() => onSelect(c.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(c.id);
                }
              }}
            >
              <MessageSquare size={14} className="sidebar__item-icon" />
              <div className="sidebar__item-text">
                <span className="sidebar__item-title">{c.title}</span>
                <span className="sidebar__item-meta">
                  {c.message_count} message{c.message_count === 1 ? "" : "s"} ·{" "}
                  {relativeTime(c.updated_at)}
                </span>
              </div>

              {confirmId === c.id ? (
                <span className="sidebar__confirm">
                  <button
                    className="sidebar__confirm-yes"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                      setConfirmId(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="sidebar__confirm-no"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(null);
                    }}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  className="sidebar__delete"
                  title="Delete conversation"
                  aria-label={`Delete ${c.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmId(c.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <p className="sidebar__footnote">Stored locally · never uploaded</p>
    </aside>
  );
};
