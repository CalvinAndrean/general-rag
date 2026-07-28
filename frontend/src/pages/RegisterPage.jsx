import React, { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function RegisterPage({ onNavigate }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", tenant_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
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
              background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
            }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">Create account</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Set up your team's RAG workspace</p>
        </div>

        <div className="skeuo-raised p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Organization Name</label>
              <input type="text" value={form.tenant_name} onChange={update("tenant_name")} placeholder="Acme Inc." required className="skeuo-inset w-full px-3.5 py-2.5 text-sm" />
            </div>

            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error-light)] border border-[var(--error-border)] rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="skeuo-btn skeuo-btn-primary w-full py-2.5 text-sm">
              {loading ? "Creating..." : "Create account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => onNavigate("login")} className="text-sm text-[var(--info)] hover:underline font-medium cursor-pointer">
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
