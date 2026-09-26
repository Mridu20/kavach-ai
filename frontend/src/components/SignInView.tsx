/**
 * SignInView — full-screen gate for the assistant.
 *
 * Two modes, chosen by the server:
 *   • First run, no accounts yet: a one-time form that creates the administrator.
 *   • Normally: sign-in only. There is no self-registration — in a plant or
 *     government deployment access is granted by an administrator, not claimed.
 *
 * Credentials go to the local backend. No identity provider, no outbound call.
 */

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, UserPlus } from "lucide-react";

import { bootstrapAdmin, fetchAuthStatus, login, type AuthUser } from "../services/api";
import "./auth.css";

interface Props {
  onSignedIn: (user: AuthUser) => void;
}

export const SignInView: React.FC<Props> = ({ onSignedIn }) => {
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthStatus()
      .then((s) => setNeedsBootstrap(s.needs_bootstrap))
      .catch(() =>
        setError("Cannot reach the backend. Ensure it is running on port 8000.")
      );
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (needsBootstrap) {
        await bootstrapAdmin({
          username,
          password,
          full_name: fullName || username,
          employee_id: employeeId || undefined,
        });
        // Sign straight in with the account just created.
        onSignedIn(await login(username, password));
      } else {
        onSignedIn(await login(username, password));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  if (needsBootstrap === null && !error) {
    return (
      <div className="auth-screen">
        <Loader2 className="auth-spin" size={22} />
      </div>
    );
  }

  const isSetup = needsBootstrap === true;

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="auth-brand__mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="auth-brand__name">KAVACH AI</h1>
            <p className="auth-brand__tag">Your data. Your hardware. Your AI.</p>
          </div>
        </div>

        {isSetup ? (
          <div className="auth-notice">
            <UserPlus size={15} />
            <span>
              No accounts exist yet. Create the administrator account — it will be the
              only one able to add further users.
            </span>
          </div>
        ) : (
          <h2 className="auth-heading">Sign in</h2>
        )}

        {isSetup && (
          <>
            <label className="auth-field">
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Plant Administrator"
                autoComplete="name"
                required
              />
            </label>
            <label className="auth-field">
              <span>Employee ID <em>(optional)</em></span>
              <input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP-00001"
              />
            </label>
          </>
        )}

        <label className="auth-field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-password">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSetup ? "At least 8 characters" : "Your password"}
              autoComplete={isSetup ? "new-password" : "current-password"}
              required
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="auth-spin" size={15} /> Please wait…
            </>
          ) : (
            <>
              <Lock size={15} /> {isSetup ? "Create administrator" : "Sign in"}
            </>
          )}
        </button>

        <p className="auth-foot">
          Accounts and history are stored locally on this machine. Nothing is sent
          anywhere.
        </p>
      </form>
    </div>
  );
};
