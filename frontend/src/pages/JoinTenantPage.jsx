import React, { useState } from "react";
import { Sparkles, ArrowRight, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function JoinTenantPage({ onNavigate }) {
  const { joinTenant } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", tenant_code: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await joinTenant(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
              boxShadow: "0 4px 16px rgba(139, 92, 246, 0.3)",
            }}
          >
            <Users className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">Join a team</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Enter your team's invite code to join</p>
        </div>

        <div className="skeuo-raised p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Invite Code</label>
              <input type="text" value={form.tenant_code} onChange={update("tenant_code")} placeholder="XXXX-XXXX" required className="skeuo-inset w-full px-3.5 py-2.5 text-sm font-mono tracking-wider text-center uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Full Name</label>
              <input type="text" value={form.full_name} onChange={update("full_name")} placeholder="John Doe" required className="skeuo-inset w-full px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="you@company.com" required className="skeuo-inset w-full px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={update("password")} placeholder="Min 6 characters" required minLength={6} className="skeuo-inset w-full px-3.5 py-2.5 text-sm" />
            </div>

            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error-light)] border border-[var(--error-border)] rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="skeuo-btn skeuo-btn-primary w-full py-2.5 text-sm">
              {loading ? "Joining..." : "Join team"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => onNavigate("login")} className="text-sm text-[var(--info)] hover:underline font-medium cursor-pointer">
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
