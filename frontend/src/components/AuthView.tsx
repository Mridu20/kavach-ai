import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Zap,
  Building2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import type { UserProfile, PasswordStrength } from "../types/auth";

interface AuthViewProps {
  onSuccess: (user: UserProfile) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const sampleUsers: UserProfile[] = [
  {
    id: "usr_001",
    fullName: "Er. Vikramaditya Sharma",
    email: "vikram.sharma@bharatrefineries.in",
    employeeId: "EMP-94820",
    role: "Chief Materials Integrity Engineer",
    organization: "Bharat Refineries & Petrochemicals Ltd.",
    provider: "local",
  },
  {
    id: "usr_002",
    fullName: "Dr. Ananya Roy",
    email: "ananya.roy@petrosafety.gov.in",
    employeeId: "EMP-10492",
    role: "Director of Statutory Safety Compliance",
    organization: "Directorate General of Mine Safety",
    provider: "google",
  },
];

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const count = [hasMinLength, hasNumber, hasUpperLower, hasSpecial].filter(Boolean).length;

  if (count <= 1) {
    return { score: 1, label: "Weak", color: "#dc2626", hasMinLength, hasNumber, hasUpperLower, hasSpecial };
  } else if (count === 2) {
    return { score: 2, label: "Fair", color: "#d97706", hasMinLength, hasNumber, hasUpperLower, hasSpecial };
  } else if (count === 3) {
    return { score: 3, label: "Good", color: "#0284c7", hasMinLength, hasNumber, hasUpperLower, hasSpecial };
  } else {
    return { score: 4, label: "Strong", color: "#16a34a", hasMinLength, hasNumber, hasUpperLower, hasSpecial };
  }
};

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onClose, isModal = false }) => {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpEmployeeId, setSignUpEmployeeId] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpOrg, setSignUpOrg] = useState("Bharat Refineries & Petrochemicals");

  const [error, setError] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(signUpPassword);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setError("Please enter your email/Employee ID and password.");
      return;
    }

    // Authenticate user
    const newUser: UserProfile = {
      id: `usr_${Date.now().toString().slice(-4)}`,
      fullName: loginIdentifier.includes("@")
        ? loginIdentifier.split("@")[0].replace(".", " ")
        : `Officer (${loginIdentifier})`,
      email: loginIdentifier.includes("@") ? loginIdentifier : `${loginIdentifier.toLowerCase()}@bharatrefineries.in`,
      employeeId: loginIdentifier.toUpperCase().startsWith("EMP-") ? loginIdentifier.toUpperCase() : `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
      role: "Senior Inspection Engineer",
      organization: "Bharat Refineries & Petrochemicals Ltd.",
      provider: "local",
    };

    onSuccess(newUser);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signUpName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes("@")) {
      setError("Please provide a valid enterprise email address.");
      return;
    }
    if (!signUpEmployeeId.trim()) {
      setError("Please enter your Official Employee ID.");
      return;
    }
    if (signUpPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now().toString().slice(-4)}`,
      fullName: signUpName.trim(),
      email: signUpEmail.trim(),
      employeeId: signUpEmployeeId.trim().toUpperCase(),
      role: "Registered Inspection Officer",
      organization: signUpOrg || "Bharat Refineries & Petrochemicals Ltd.",
      provider: "local",
    };

    onSuccess(newUser);
  };

  const handleGoogleLogin = () => {
    const googleUser: UserProfile = {
      id: "usr_google_8832",
      fullName: "Er. Rahul Verma",
      email: "rahul.verma.sih@gmail.com",
      employeeId: "EMP-77419",
      role: "Lead Systems Inspector (Google SSO)",
      organization: "National Informatics Centre (NIC)",
      avatarUrl: "https://lh3.googleusercontent.com/a/default-user",
      provider: "google",
    };
    onSuccess(googleUser);
  };

  const content = (
    <div
      className="panel"
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
        border: "1px solid var(--border-base)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: "#0f172a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "var(--brand-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>
              KAVACH AI SOVEREIGN
            </div>
            <div style={{ fontSize: "0.725rem", color: "#94a3b8" }}>
              Enterprise Inspection Portal
            </div>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-dim)",
          background: "#f8fafc",
        }}
      >
        <button
          onClick={() => { setActiveTab("login"); setError(null); }}
          style={{
            flex: 1,
            padding: "0.85rem",
            background: activeTab === "login" ? "#ffffff" : "transparent",
            border: "none",
            borderBottom: activeTab === "login" ? "2px solid var(--brand-blue)" : "2px solid transparent",
            color: activeTab === "login" ? "var(--brand-navy)" : "var(--text-muted)",
            fontWeight: activeTab === "login" ? 700 : 500,
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => { setActiveTab("signup"); setError(null); }}
          style={{
            flex: 1,
            padding: "0.85rem",
            background: activeTab === "signup" ? "#ffffff" : "transparent",
            border: "none",
            borderBottom: activeTab === "signup" ? "2px solid var(--brand-blue)" : "2px solid transparent",
            color: activeTab === "signup" ? "var(--brand-navy)" : "var(--text-muted)",
            fontWeight: activeTab === "signup" ? 700 : 500,
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Create Account
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: "1.5rem" }}>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              fontSize: "0.8rem",
              color: "var(--red-500)",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <XCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            padding: "0.65rem 1rem",
            borderRadius: "6px",
            background: "#ffffff",
            border: "1px solid var(--border-base)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            marginBottom: "1.25rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "1rem 0",
            gap: "0.75rem",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
            or with credentials
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }} />
        </div>

        {/* LOGIN FORM */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                Enterprise Email or Employee ID
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input-base"
                  style={{ paddingLeft: "2.3rem" }}
                  placeholder="e.g. EMP-94820 or officer@bharatrefineries.in"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                />
                <UserIcon size={16} color="var(--text-dim)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-base"
                  style={{ paddingLeft: "2.3rem", paddingRight: "2.3rem" }}
                  placeholder="Enter your security password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <Lock size={16} color="var(--text-dim)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: "100%", padding: "0.65rem", marginTop: "0.5rem" }}>
              Sign In to Sovereign Portal
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {activeTab === "signup" && (
          <form onSubmit={handleSignUpSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input-base"
                  style={{ paddingLeft: "2.3rem" }}
                  placeholder="e.g. Er. Vikramaditya Sharma"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                />
                <UserIcon size={15} color="var(--text-dim)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Enterprise Email
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    className="input-base"
                    style={{ paddingLeft: "2.1rem" }}
                    placeholder="name@refinery.in"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                  />
                  <Mail size={15} color="var(--text-dim)" style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Employee ID
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="input-base"
                    style={{ paddingLeft: "2.1rem" }}
                    placeholder="EMP-94820"
                    value={signUpEmployeeId}
                    onChange={(e) => setSignUpEmployeeId(e.target.value)}
                  />
                  <BadgeCheck size={15} color="var(--brand-blue)" style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)" }} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                Organization / PSU Directorate
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input-base"
                  style={{ paddingLeft: "2.3rem" }}
                  placeholder="e.g. Bharat Refineries & Petrochemicals Ltd."
                  value={signUpOrg}
                  onChange={(e) => setSignUpOrg(e.target.value)}
                />
                <Building2 size={15} color="var(--text-dim)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                Create Strong Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-base"
                  style={{ paddingLeft: "2.3rem" }}
                  placeholder="At least 8 characters"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
                <Lock size={15} color="var(--text-dim)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              </div>

              {/* Password Strength Indicator */}
              {signUpPassword.length > 0 && (
                <div style={{ marginTop: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.725rem", marginBottom: "0.2rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Password Strength:</span>
                    <strong style={{ color: passwordStrength.color }}>{passwordStrength.label}</strong>
                  </div>
                  <div style={{ height: "4px", background: "var(--border-dim)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        background: passwordStrength.color,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem", marginTop: "0.4rem", fontSize: "0.7rem" }}>
                    <span style={{ color: passwordStrength.hasMinLength ? "var(--green-600)" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      {passwordStrength.hasMinLength ? <CheckCircle2 size={11} /> : "○"} 8+ Characters
                    </span>
                    <span style={{ color: passwordStrength.hasNumber ? "var(--green-600)" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      {passwordStrength.hasNumber ? <CheckCircle2 size={11} /> : "○"} Includes Number
                    </span>
                    <span style={{ color: passwordStrength.hasUpperLower ? "var(--green-600)" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      {passwordStrength.hasUpperLower ? <CheckCircle2 size={11} /> : "○"} Upper & Lower
                    </span>
                    <span style={{ color: passwordStrength.hasSpecial ? "var(--green-600)" : "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      {passwordStrength.hasSpecial ? <CheckCircle2 size={11} /> : "○"} Special Symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                Confirm Password
              </label>
              <input
                type="password"
                className="input-base"
                placeholder="Re-enter password"
                value={signUpConfirmPassword}
                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: "100%", padding: "0.65rem", marginTop: "0.4rem" }}>
              Complete Registration
            </button>
          </form>
        )}

        {/* Hackathon Quick-Demo Presets */}
        <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-dim)", paddingTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Zap size={14} color="var(--amber-500)" />
            <span>Hackathon Presentation 1-Click Login Presets:</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {sampleUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onSuccess(user)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.45rem 0.75rem",
                  background: "#f8fafc",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
              >
                <div>
                  <strong style={{ color: "var(--brand-navy)" }}>{user.fullName}</strong>
                  <span style={{ color: "var(--text-dim)", marginLeft: "0.4rem" }}>({user.employeeId})</span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--brand-blue)", fontWeight: 600 }}>Sign In →</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem",
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
