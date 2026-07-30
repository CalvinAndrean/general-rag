import React, { useState, useRef } from "react";
import { UploadCloud, File, CheckCircle2, Clock, AlertCircle, Folder as FolderIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "../../lib/api";
import { CustomSelect } from "../../components/ui/CustomSelect";

export function DocumentUpload({ folders = [], folderId, onFolderChange, onUploadSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = useRef(null);

  const activeFolderObj = folders.find((f) => f.id === folderId);

  const folderOptions = [
    { value: "root", label: "📁 Root (/) - All Files" },
    ...folders.map((f) => ({ value: f.id, label: `📁 ${f.name} (/${f.name}/)` })),
  ];

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    const targetFolderId = folderId === "root" ? null : folderId;

    const initialQueue = fileList.map((f, idx) => ({
      id: `${Date.now()}-${idx}`,
      file: f,
      name: f.name,
      size: f.size,
      status: "queued",
      progress: 0,
      error: null,
    }));

    setUploadQueue((prev) => [...initialQueue, ...prev]);

    await Promise.all(
      initialQueue.map(async (item) => {
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 5 } : q))
        );

        try {
          await uploadDocument(item.file, targetFolderId, (percent) => {
            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? {
                      ...q,
                      progress: percent,
                      status: percent >= 100 ? "processing" : "uploading",
                    }
                  : q
              )
            );
          });

          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "completed", progress: 100 } : q
            )
          );
          toast.success(`Successfully uploaded "${item.name}"`);
        } catch (err) {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "failed", error: err.message || "Upload failed" }
                : q
            )
          );
          toast.error(`Failed to upload "${item.name}": ${err.message}`);
        }
      })
    );

    if (onUploadSuccess) {
      await onUploadSuccess();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="skeuo-raised p-6 space-y-4">
      {/* Target Folder Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] pb-3">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4 text-[var(--info)]" />
          <span className="text-xs font-bold text-[var(--text-heading)]">Upload Destination Folder:</span>
        </div>
        {folders.length > 0 && onFolderChange ? (
          <CustomSelect
            value={folderId || "root"}
            onChange={(val) => onFolderChange(val === "root" ? null : val)}
            options={folderOptions}
            className="w-64"
          />
        ) : (
          <span className="skeuo-badge skeuo-badge-neutral text-xs font-mono">
            {activeFolderObj ? `/${activeFolderObj.name}/` : "Root (/)"}
          </span>
        )}
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-[var(--info)] bg-[var(--info-light)]"
            : "border-[var(--border-medium)] hover:border-[var(--text-secondary)] bg-[var(--bg-surface)]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[var(--info-light)] border border-[var(--info-border)] shadow-xs flex items-center justify-center text-[var(--info)]">
            <UploadCloud className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-heading)]">
              Click or drag multiple files here to upload
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Destination:{" "}
              <span className="font-semibold text-[var(--text-heading)]">
                {activeFolderObj ? `/${activeFolderObj.name}/` : "Root (/)"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Upload Queue Progress */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 border-t border-[var(--border-light)] pt-3">
          <h4 className="text-xs font-bold text-[var(--text-secondary)]">Recent Upload Queue</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-[var(--border-light)] flex items-center justify-between gap-3 text-xs shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <File className="h-4 w-4 text-[var(--info)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-heading)] truncate">{item.name}</p>
                    {item.status === "failed" && item.error && (
                      <p className="text-[11px] text-[var(--error)] mt-0.5 font-medium">{item.error}</p>
                    )}
                    {item.status === "uploading" && (
                      <div className="w-full bg-[var(--bg-hover)] h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-[var(--info)] h-full transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {item.status === "uploading" && (
                    <span className="text-[11px] font-mono text-[var(--info)] font-semibold">
                      Uploading {item.progress}%
                    </span>
                  )}
                  {item.status === "processing" && (
                    <span className="skeuo-badge skeuo-badge-warning animate-pulse">
                      <Clock className="h-3 w-3" /> Processing OCR & Chunks...
                    </span>
                  )}
                  {item.status === "completed" && (
                    <span className="skeuo-badge skeuo-badge-success">
                      <CheckCircle2 className="h-3 w-3" /> Indexed!
                    </span>
                  )}
                  {item.status === "failed" && (
                    <span className="skeuo-badge skeuo-badge-error">
                      <AlertCircle className="h-3 w-3" /> Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
