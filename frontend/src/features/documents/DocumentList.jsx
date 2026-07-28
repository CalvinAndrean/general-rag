import React, { useState } from "react";
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Download,
  Folder as FolderIcon,
  FolderPlus,
  ListFilter,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { toggleDocumentActive, createFolder } from "../../lib/api";
import { toast } from "sonner";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { CustomSelect } from "../../components/ui/CustomSelect";

export function DocumentList({
  documents,
  folders,
  loading,
  error,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  selectedFolder,
  setSelectedFolder,
  viewMode,
  setViewMode,
  onDeleteClick,
  onPreviewClick,
  onRefresh,
}) {
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "docx":
        return <FileCode className="h-4 w-4 text-blue-500" />;
      case "xlsx":
        return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
      case "png":
      case "jpg":
      case "jpeg":
        return <FileImage className="h-4 w-4 text-amber-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "indexed":
        return (
          <span className="skeuo-badge skeuo-badge-success">
            <CheckCircle2 className="h-3 w-3" /> Indexed
          </span>
        );
      case "processing":
        return (
          <span className="skeuo-badge skeuo-badge-warning animate-pulse">
            <Clock className="h-3 w-3" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="skeuo-badge skeuo-badge-error">
            <AlertTriangle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return <span className="skeuo-badge skeuo-badge-neutral">{status}</span>;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleActiveToggle = async (docId, currentActive) => {
    try {
      await toggleDocumentActive(docId, !currentActive);
      toast.success(`Document knowledge base status updated!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || "Failed to update active state");
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await createFolder(newFolderName.trim());
      toast.success(`Folder "${newFolderName}" created!`);
      setNewFolderName("");
      setShowFolderModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDownload = (doc, e) => {
    e.stopPropagation();
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

  return (
    <div className="skeuo-raised overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 border-b border-[var(--border-light)] flex flex-wrap items-center justify-between gap-3 bg-white">
        {/* Search & Mode Toggle */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name..."
              className="skeuo-inset pl-9 pr-3 py-1.5 text-xs w-full"
            />
          </div>

          {/* View Mode Toggle: Folders vs Flat View */}
          <div className="flex items-center bg-[var(--bg-hover)] p-0.5 rounded-lg border border-[var(--border-light)] text-xs">
            <button
              onClick={() => setViewMode("folder")}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === "folder"
                  ? "bg-white shadow-xs text-[var(--text-heading)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-heading)]"
              }`}
            >
              <FolderIcon className="h-3.5 w-3.5 text-[var(--info)]" /> Folders
            </button>
            <button
              onClick={() => {
                setViewMode("flat");
                setSelectedFolder(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === "flat"
                  ? "bg-white shadow-xs text-[var(--text-heading)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-heading)]"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5 text-[var(--info)]" /> Show All Files
            </button>
          </div>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center gap-2">
          {/* Create Folder Button */}
          <button
            onClick={() => setShowFolderModal(true)}
            className="skeuo-btn skeuo-btn-sm text-xs gap-1 cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-[var(--info)]" /> New Folder
          </button>

          {/* Custom Status Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "indexed", label: "Indexed" },
                { value: "processing", label: "Processing" },
                { value: "failed", label: "Failed" },
              ]}
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* Folder Breadcrumb Nav (if Folder View) */}
      {viewMode === "folder" && (
        <div className="px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-light)] flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`hover:underline font-semibold cursor-pointer ${
              !selectedFolder ? "text-[var(--info)] font-bold" : ""
            }`}
          >
            Root / All Folders
          </button>
          {selectedFolder && (
            <>
              <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
              <span className="font-bold text-[var(--text-heading)]">
                {folders.find((f) => f.id === selectedFolder)?.name || "Folder"}
              </span>
            </>
          )}
        </div>
      )}

      {/* Folder Cards Grid (if at Root in Folder View) */}
      {viewMode === "folder" && !selectedFolder && folders.length > 0 && (
        <div className="p-4 border-b border-[var(--border-light)] grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-surface)]">
          {folders.map((f) => (
            <div
              key={f.id}
              onClick={() => setSelectedFolder(f.id)}
              className="bg-white p-3 rounded-xl border border-[var(--border-light)] hover:border-[var(--info-border)] hover:shadow-sm transition-all cursor-pointer flex items-center gap-3 group"
            >
              <FolderOpen className="h-5 w-5 text-[var(--info)] group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--text-heading)] truncate">{f.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Directory</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Table / States */}
      {loading && documents.length === 0 ? (
        <TableSkeleton rows={5} cols={8} />
      ) : error ? (
        <div className="p-8 text-center text-xs text-[var(--error)]">{error}</div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-1">
          <p className="font-bold text-[var(--text-heading)]">No documents found</p>
          <p>Upload a file above to add documents to your knowledge base.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="skeuo-table">
            <thead>
              <tr>
                <th>Knowledge Base</th>
                <th>Document Name</th>
                <th>Version</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  {/* Knowledge Base Toggle Switch */}
                  <td className="w-28">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doc.is_active}
                        onChange={() => handleActiveToggle(doc.id, doc.is_active)}
                        className="h-4 w-4 accent-[var(--info)] rounded cursor-pointer"
                      />
                      <span className={`text-[11px] font-semibold ${doc.is_active ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                        {doc.is_active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>

                  {/* Document Name & Folder Path Info */}
                  <td className="font-semibold text-[var(--text-heading)]">
                    <div
                      onClick={() => onPreviewClick(doc)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      {getFileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <span className="truncate max-w-xs group-hover:text-[var(--info)] transition-colors">
                          {doc.name}
                        </span>
                        {/* Folder path info tag */}
                        <p className="text-[10px] text-[var(--text-muted)] font-normal flex items-center gap-1">
                          <FolderIcon className="h-3 w-3" />
                          <span>{doc.folder_path || "/"}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Version Tag */}
                  <td>
                    <span className="skeuo-badge skeuo-badge-neutral font-mono">{doc.version || "v1.0"}</span>
                  </td>

                  <td className="uppercase text-[11px] font-mono text-[var(--text-secondary)]">
                    {doc.file_type}
                  </td>
                  <td className="text-xs text-[var(--text-body)]">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td>{getStatusBadge(doc.status)}</td>
                  <td className="text-xs text-[var(--text-muted)]">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>

                  {/* Row Actions */}
                  <td className="text-right space-x-1">
                    {/* Preview Button */}
                    <button
                      onClick={() => onPreviewClick(doc)}
                      className="skeuo-btn skeuo-btn-ghost skeuo-btn-sm text-xs cursor-pointer"
                      title="Preview document"
                    >
                      <Eye className="h-3.5 w-3.5 text-[var(--info)]" />
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={(e) => handleDownload(doc, e)}
                      className="skeuo-btn skeuo-btn-ghost skeuo-btn-sm text-xs cursor-pointer"
                      title="Download document"
                    >
                      <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteClick(doc)}
                      className="skeuo-btn skeuo-btn-ghost skeuo-btn-sm text-[var(--error)] hover:bg-[var(--error-light)] cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[var(--border-light)] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--text-heading)] flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-[var(--info)]" /> Create New Folder
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Invoices, Technical Docs..."
                  required
                  className="skeuo-inset w-full px-3.5 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="skeuo-btn skeuo-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="skeuo-btn skeuo-btn-primary text-xs"
                >
                  {creatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
