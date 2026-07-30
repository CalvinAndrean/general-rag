import React from "react";
import { User } from "lucide-react";
import { SourceCitations } from "./SourceCitations";
import { MarkdownRenderer } from "./MarkdownRenderer";

export function MessageItem({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-700"
            : "bg-[var(--info-light)] text-[var(--info)] border-[var(--info-border)]"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <img src="/Logo-Cognava-Assistant.png" alt="Cognava Assistant" className="h-6 w-6 object-contain rounded-sm shrink-0" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-2xl space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`p-4 rounded-2xl text-xs leading-relaxed ${
            isUser
              ? "bg-[var(--info)] text-white shadow-xs rounded-tr-xs"
              : "bg-[#f8fafc] text-[var(--text-heading)] border border-[#e2e8f0] shadow-xs rounded-tl-xs"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <>
              {message.content && <MarkdownRenderer content={message.content} />}
              {message.isStreaming && !message.content && (
                <span className="inline-block animate-pulse text-[var(--text-muted)] font-medium">
                  {message.statusText || "Thinking..."}
                </span>
              )}
            </>
          )}
        </div>

        {/* Source Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <SourceCitations citations={message.citations} />
        )}
      </div>
    </div>
  );
}
