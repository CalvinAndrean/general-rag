import React from "react";
import { Toaster } from "sonner";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { FloatingChatWidget } from "../FloatingChatWidget";

export function AppLayout({ activePage, onNavigate, indexedDocCount = 0, children }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar activePage={activePage} />

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Floating Chatbot FAB & Widget */}
      <FloatingChatWidget indexedDocCount={indexedDocCount} />

      {/* Sonner Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "skeuo-toast",
          style: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          },
        }}
        richColors={false}
        gap={8}
      />
    </div>
  );
}
