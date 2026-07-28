import React, { useState, useEffect } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Maximize2,
  Loader2,
} from "lucide-react";

export function DocumentPreviewModal({ document: doc, isOpen, onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingBlob, setLoadingBlob] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let currentBlobUrl = null;

    async function loadBlob() {
      if (isOpen && doc?.s3_url) {
        setLoadingBlob(true);
        setPreviewError(false);
        try {
          const res = await fetch(doc.s3_url);
          if (!res.ok) throw new Error("Failed to fetch file content");
          const rawBlob = await res.blob();
          
          // Determine mime type
          let mimeType = rawBlob.type;
          const ext = doc.file_type.toLowerCase();
          if (ext === "pdf") mimeType = "application/pdf";
          else if (["png", "jpg", "jpeg"].includes(ext)) mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

          const pdfBlob = new Blob([rawBlob], { type: mimeType });
          currentBlobUrl = URL.createObjectURL(pdfBlob);
          setBlobUrl(currentBlobUrl);
        } catch (err) {
          console.error("Error creating blob preview:", err);
          setPreviewError(true);
        } finally {
          setLoadingBlob(false);
        }
      }
    }

    loadBlob();

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      setBlobUrl(null);
      setScale(1);
      setRotation(0);
    };
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotateLeft = () => setRotation((prev) => prev - 90);
  const handleRotateRight = () => setRotation((prev) => prev + 90);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleManualDownload = () => {
    if (doc.s3_url) {
      const a = window.document.createElement("a");
      a.href = doc.s3_url;
      a.download = doc.name;
      a.target = "_blank";
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    }
  };

  const isImage = ["png", "jpg", "jpeg"].includes(doc.file_type.toLowerCase());
  const isPdf = doc.file_type.toLowerCase() === "pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-[var(--border-light)] animate-in fade-in zoom-in duration-150">
        {/* Modal Toolbar */}
        <div className="px-6 py-3.5 border-b border-[var(--border-light)] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[var(--info-light)] text-[var(--info)] border border-[var(--info-border)] flex items-center justify-center shrink-0">
              {isImage ? (
                <FileImage className="h-4 w-4" />
              ) : isPdf ? (
                <FileText className="h-4 w-4 text-red-500" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--text-heading)] truncate">
                {doc.name}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                <span className="uppercase font-mono font-semibold">{doc.file_type}</span>
                <span>•</span>
                <span>{doc.version || "v1.0"}</span>
                <span>•</span>
                <span>{doc.folder_path || "/"}</span>
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5">
            {/* Zoom / Rotate Controls for Images */}
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono font-bold text-[var(--text-secondary)] px-1">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="h-4 w-px bg-[var(--border-light)] mx-1" />
                <button
                  onClick={handleRotateLeft}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                  title="Rotate Left (-90°)"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRotateRight}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                  title="Rotate Right (+90°)"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                  title="Fit to Screen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className="h-4 w-px bg-[var(--border-light)] mx-1" />
              </>
            )}

            {/* Manual Download Button */}
            <button
              onClick={handleManualDownload}
              className="skeuo-btn skeuo-btn-primary skeuo-btn-sm text-xs gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors cursor-pointer ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 bg-[#f8fafc] overflow-hidden p-4 flex items-center justify-center relative">
          {loadingBlob ? (
            <div className="flex flex-col items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--info)]" />
              <span>Loading preview...</span>
            </div>
          ) : isImage && blobUrl ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={blobUrl}
                alt={doc.name}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  transition: "transform 0.2s ease-out",
                }}
                className="rounded-lg shadow-md"
              />
            </div>
          ) : isPdf && blobUrl ? (
            <div className="w-full h-full bg-white rounded-xl border border-[var(--border-light)] overflow-hidden shadow-xs relative">
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <embed src={blobUrl} type="application/pdf" className="w-full h-full" />
              </object>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[var(--border-light)] text-center max-w-md shadow-sm space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-[var(--info-light)] text-[var(--info)] border border-[var(--info-border)] mx-auto flex items-center justify-center">
                {doc.file_type.toLowerCase() === "xlsx" ? (
                  <FileSpreadsheet className="h-8 w-8" />
                ) : (
                  <FileCode className="h-8 w-8" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-heading)]">{doc.name}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Preview not rendered inline for {doc.file_type.toUpperCase()} files. You can download the file to inspect.
                </p>
              </div>
              <button
                onClick={handleManualDownload}
                className="skeuo-btn skeuo-btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Download Original File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
