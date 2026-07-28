import React from "react";
import { Search } from "lucide-react";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  documents: "Documents",
  chat: "Chat / Playground",
  settings: "Prompt & Model Settings",
  members: "Members",
  usage: "Usage & Cost",
  evaluation: "Evaluation",
  analytics: "Analytics & Insight",
  profile: "Profile",
};

const PAGE_DESCRIPTIONS = {
  dashboard: "Overview of your RAG system performance and activity",
  documents: "Upload, manage, and index documents into the knowledge base",
  chat: "Test RAG queries with streaming answers and source citations",
  settings: "Configure LLM model, temperature, and system prompt",
  members: "Manage team members and tenant access",
  usage: "Monitor token usage, API costs, and billing breakdown",
  evaluation: "View Ragas quality scores for RAG query evaluations",
  analytics: "Explore question patterns and usage trends",
  profile: "Manage your account and security settings",
};

export function TopBar({ activePage }) {
  const title = PAGE_TITLES[activePage] || "Dashboard";
  const description = PAGE_DESCRIPTIONS[activePage] || "";

  return (
    <header className="h-16 border-b border-[var(--border-light)] bg-[var(--bg-raised)] px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div>
        <h2 className="text-[15px] font-bold text-[var(--text-heading)]">{title}</h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>

      {/* Global search (decorative for now) */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search anything..."
          className="skeuo-inset pl-9 pr-4 py-2 text-xs w-[240px]"
        />
      </div>
    </header>
  );
}
