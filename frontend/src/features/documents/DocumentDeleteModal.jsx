import React from "react";
import { AlertTriangle } from "lucide-react";

export function DocumentDeleteModal({ document, isOpen, onClose, onConfirm, deleting }) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="skeuo-raised max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--error-light)] border border-[var(--error-border)] flex items-center justify-center text-[var(--error)] shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-heading)]">Delete Document</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-xs text-[var(--text-body)]">
          Are you sure you want to delete <span className="font-semibold text-[var(--text-heading)]">"{document.name}"</span>? All extracted vector chunks and S3 files will be permanently removed.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-light)]">
          <button
            onClick={onClose}
            disabled={deleting}
            className="skeuo-btn skeuo-btn-ghost text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(document.id)}
            disabled={deleting}
            className="skeuo-btn skeuo-btn-danger text-xs"
          >
            {deleting ? "Deleting..." : "Delete Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
