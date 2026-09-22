/**
 * UserManagement — administrator panel for creating and removing accounts.
 *
 * Only reachable by an administrator. The backend enforces this independently,
 * so hiding the button is convenience, not the security boundary.
 */

import React, { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus, X } from "lucide-react";

import { createUser, deleteUser, fetchUsers, type AuthUser } from "../services/api";
import "./auth.css";

interface Props {
  currentUser: AuthUser;
  onClose: () => void;
}

export const UserManagement: React.FC<Props> = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setUsers(await fetchUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts.");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await createUser({
        username,
        password,
        full_name: fullName || username,
        employee_id: employeeId || undefined,
        role,
      });
      setNotice(`Account "${username}" created. Share the password with them directly.`);
      setUsername("");
      setPassword("");
      setFullName("");
      setEmployeeId("");
      setRole("user");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (user: AuthUser) => {
    // Deleting an account is not reversible and takes their history with it.
    if (!window.confirm(`Delete "${user.username}"? Their conversations stay on disk but become unreachable.`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account.");
    }
  };

  return (
    <div className="users-overlay" onClick={onClose}>
      <div className="users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="users-modal__head">
          <h2 className="users-modal__title">User accounts</h2>
          <button className="auth-eye" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Employee ID</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.username}</td>
                <td>{u.employee_id || "—"}</td>
                <td>
                  <span className={`users-role${u.role === "admin" ? " users-role--admin" : ""}`}>
                    {u.role}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {u.id !== currentUser.id && (
                    <button
                      className="auth-eye"
                      onClick={() => remove(u)}
                      aria-label={`Delete ${u.username}`}
                      title="Delete account"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="users-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Employee ID <em>(optional)</em></span>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Temporary password</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          <label className="auth-field">
            <span>Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.88rem",
                padding: "0.55rem 0.7rem",
                borderRadius: 8,
                border: "1px solid var(--border-base)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          {error && <p className="auth-error">{error}</p>}
          {notice && (
            <p className="auth-foot" style={{ gridColumn: "1 / -1", color: "var(--text-muted)" }}>
              {notice}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 className="auth-spin" size={15} /> : <UserPlus size={15} />}
            Create account
          </button>
        </form>
      </div>
    </div>
  );
};
