import React, { useState } from "react";
import { Sparkles, ArrowRight, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] px-4">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
            }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Sign in to your General RAG account
          </p>
        </div>

        {/* Login Card */}
        <div className="skeuo-raised p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="skeuo-inset w-full px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="skeuo-inset w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error-light)] border border-[var(--error-border)] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="skeuo-btn skeuo-btn-primary w-full py-2.5 text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => onNavigate("register")}
            className="text-sm text-[var(--info)] hover:underline font-medium cursor-pointer"
          >
            Create a new account
          </button>
          <p className="text-xs text-[var(--text-muted)]">or</p>
          <button
            onClick={() => onNavigate("join")}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1.5 mx-auto cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Join an existing team
          </button>
        </div>
      </div>
    </div>
  );
}
