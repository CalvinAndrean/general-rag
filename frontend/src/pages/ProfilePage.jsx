import React from "react";
import { UserCircle, Shield, Building, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="w-full space-y-6">
      {/* Account Info Card */}
      <div className="skeuo-raised p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-[var(--border-light)] pb-5">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white border-2 border-white shadow-md"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
          >
            {user?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-heading)]">{user?.full_name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            <span className="skeuo-badge skeuo-badge-info mt-2 inline-flex items-center gap-1">
              <Shield className="h-3 w-3" /> {user?.role}
            </span>
          </div>
        </div>

        {/* Tenant Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Tenant Information</h4>
          <div className="bg-white p-4 rounded-xl border border-[var(--border-light)] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Organization Name</span>
              <span className="font-semibold text-[var(--text-heading)]">{user?.tenant_name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Tenant ID</span>
              <span className="font-mono text-[var(--text-secondary)]">{user?.tenant_id}</span>
            </div>
          </div>
        </div>

        {/* Logout Action */}
        <div className="pt-4 border-t border-[var(--border-light)] flex justify-end">
          <button
            onClick={logout}
            className="skeuo-btn skeuo-btn-danger text-xs flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
