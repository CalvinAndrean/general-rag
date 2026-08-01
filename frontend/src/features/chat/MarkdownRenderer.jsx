import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/**
 * Custom Markdown renderer for AI chat responses.
 * Renders headings, paragraphs, lists, code blocks, tables, links, blockquotes, and more.
 */
export function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-[var(--text-heading)] mt-4 mb-2 pb-1 border-b border-[var(--border-light)]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-[var(--text-heading)] mt-3 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-[var(--text-heading)] mt-2.5 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-[var(--text-heading)] mt-2 mb-0.5">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-xs leading-relaxed mb-2 last:mb-0">{children}</p>
          ),

          // Bold and Italic
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--text-heading)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic opacity-90">{children}</em>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 space-y-0.5 mb-2 text-xs">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 space-y-0.5 mb-2 text-xs">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-xs leading-relaxed pl-0.5">{children}</li>
          ),

          // Code (inline and block)
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="bg-[#1e293b] text-[#e2e8f0] text-[11px] px-1.5 py-0.5 rounded-md font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className || ""} text-[11px] font-mono`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-[#0f172a] text-[#e2e8f0] rounded-lg p-3 my-2 overflow-x-auto text-[11px] leading-relaxed border border-[#1e293b]">
              {children}
            </pre>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-[var(--info)] bg-[var(--info-light)] rounded-r-lg px-3 py-2 my-2 text-xs italic text-[var(--text-secondary)]">
              {children}
            </blockquote>
          ),

          // Horizontal Rule
          hr: () => <hr className="border-t border-[var(--border-light)] my-3" />,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--info)] hover:text-blue-700 underline underline-offset-2 decoration-blue-300 transition-colors"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[var(--border-light)] shadow-2xs bg-white w-full max-w-full">
              <table className="min-w-max w-full text-xs border-collapse divide-y divide-[var(--border-light)]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#f8fafc] text-[var(--text-heading)] font-semibold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[var(--border-light)] bg-white">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/80 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-[var(--text-heading)] uppercase tracking-wider whitespace-nowrap bg-[#f8fafc] border-b border-[var(--border-light)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-xs text-[var(--text-body)] whitespace-nowrap align-top">
              {children}
            </td>
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              className="rounded-lg max-w-full my-2 border border-[var(--border-light)] shadow-xs"
            />
          ),

          // Strikethrough
          del: ({ children }) => (
            <del className="line-through opacity-60">{children}</del>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
