import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, Sparkles, RefreshCcw, Minimize2 } from "lucide-react";
import { streamQuery } from "../lib/api";
import { MessageItem } from "../features/chat/MessageItem";

export function FloatingChatWidget({ indexedDocCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isStreaming, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { id: Date.now(), role: "user", content: input.trim() };
    const botMessageId = Date.now() + 1;
    const botMessage = {
      id: botMessageId,
      role: "assistant",
      content: "",
      citations: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const historyPayload = messages
        .filter((m) => m.content && !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      await streamQuery({
        question: userMessage.content,
        chatHistory: historyPayload,
        topK: 4,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        onCitations: (citations) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, citations } : msg
            )
          );
        },
        onStatus: (statusText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, statusText } : msg
            )
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    content: `Error: ${err.message || "Failed to retrieve response"}`,
                    isStreaming: false,
                  }
                : msg
            )
          );
        },
      });
    } finally {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            boxShadow: "0 8px 30px rgba(37, 99, 235, 0.45)",
          }}
          title="Open Cognava Assistant Chatbot"
        >
          <MessageSquare className="h-6 w-6 transition-transform group-hover:rotate-12" />
        </button>
      )}

      {/* Floating Chat Popover Window (Smooth Animation) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[580px] bg-white rounded-2xl border border-[var(--border-light)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-250 ease-out">
          {/* Widget Header */}
          <div className="px-4 py-3 border-b border-[var(--border-light)] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <img src="/Logo-Cognava-Assistant.png" alt="Cognava Assistant" className="h-8 w-8 object-contain shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-[var(--text-heading)] leading-tight">Cognava Assistant</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {indexedDocCount} active documents
                </p>
              </div>
            </div>


            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors cursor-pointer"
                  title="Clear chat"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors cursor-pointer"
                title="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-[var(--info-light)] text-[var(--info)] border border-[var(--info-border)] flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-heading)]">How can I help you?</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 max-w-[260px]">
                    Ask questions about your uploaded PDFs, DOCX, XLSX, or images.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border-light)] bg-white flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isStreaming}
              className="skeuo-inset flex-1 px-3.5 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="skeuo-btn skeuo-btn-primary p-2 text-xs flex items-center justify-center rounded-xl cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
