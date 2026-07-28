import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, FileText } from "lucide-react";

export function SourceCitations({ citations }) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-2 border border-[var(--border-light)] rounded-xl bg-[var(--bg-surface)] overflow-hidden text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5 text-[11px]">
          <BookOpen className="h-3.5 w-3.5 text-[var(--info)]" />
          {citations.length} Cited Sources
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="p-3 border-t border-[var(--border-light)] space-y-2 max-h-60 overflow-y-auto">
          {citations.map((cite, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-light)] space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-heading)]">
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <FileText className="h-3 w-3 text-[var(--info)] shrink-0" />
                  {cite.document_name}
                </span>
                {cite.score !== null && (
                  <span className="text-[10px] font-semibold text-[var(--success)] bg-[var(--success-light)] px-1.5 py-0.5 rounded border border-[var(--success-border)]">
                    Match: {Math.round(cite.score * 100)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-body)] italic bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-light)]">
                "{cite.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
