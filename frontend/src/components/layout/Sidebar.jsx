import React, { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  Users,
  BarChart3,
  FlaskConical,
  TrendingUp,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "members", label: "Members", icon: Users, adminOnly: true },
  { key: "usage", label: "Usage & Cost", icon: BarChart3, adminOnly: true },
  { key: "evaluation", label: "Evaluation", icon: FlaskConical },
  { key: "analytics", label: "Analytics", icon: TrendingUp },
  { key: "profile", label: "Profile", icon: UserCircle },
];

export function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  return (
    <aside
      className={`skeuo-sidebar flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border-light)] shrink-0">
        <img
          src="/favicon.png"
          alt="Cognava Logo"
          className="h-10 w-10 object-contain shrink-0 drop-shadow-xs"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-extrabold text-[var(--text-heading)] truncate leading-tight tracking-tight">
              Cognava
            </h1>
            <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">
              {user?.tenant_name || "Platform"}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`skeuo-nav-item w-full ${isActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom: User + Collapse */}
      <div className="border-t border-[var(--border-light)] px-3 py-3 space-y-2 shrink-0">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="skeuo-nav-item w-full justify-center"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="truncate text-xs">Collapse</span>
            </>
          )}
        </button>

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-2 px-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
              }}
            >
              {user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">
                  {user.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
