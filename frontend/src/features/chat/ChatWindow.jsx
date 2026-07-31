import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RefreshCcw } from "lucide-react";
import { streamQuery } from "../../lib/api";
import { MessageItem } from "./MessageItem";

export function ChatWindow({ indexedDocCount }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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
    <div className="skeuo-raised flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden bg-white">
      {/* Header Info */}
      <div className="p-4 border-b border-[var(--border-light)] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/Logo-Cognava-Assistant.png" alt="Cognava Assistant" className="h-8 w-8 object-contain shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-[var(--text-heading)] leading-tight">Cognava Assistant</h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {indexedDocCount} active documents
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="skeuo-btn skeuo-btn-ghost skeuo-btn-sm text-xs cursor-pointer"
            title="Clear chat history"
          >
            <RefreshCcw className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--info-light)] border border-[var(--info-border)] shadow-xs flex items-center justify-center text-[var(--info)]">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-heading)] text-sm">Ask anything about your documents</p>
              <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
                Answers will be generated using vector similarity search over your uploaded knowledge base.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border-light)] bg-white flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your indexed documents..."
          disabled={isStreaming}
          className="skeuo-inset flex-1 px-4 py-2.5 text-xs rounded-xl"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="skeuo-btn skeuo-btn-primary py-2.5 px-5 text-xs flex items-center gap-1.5 cursor-pointer rounded-xl"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </form>
    </div>
  );
}
