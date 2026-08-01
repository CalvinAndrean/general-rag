import React, { useState, useEffect } from "react";
import { Loader2, Bot } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { JoinTenantPage } from "./pages/JoinTenantPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentUpload } from "./features/documents/DocumentUpload";
import { DocumentList } from "./features/documents/DocumentList";
import { DocumentDeleteModal } from "./features/documents/DocumentDeleteModal";
import { DocumentPreviewModal } from "./features/documents/DocumentPreviewModal";
import { SettingsPage } from "./pages/SettingsPage";
import { MembersPage } from "./pages/MembersPage";
import { UsageCostPage } from "./pages/UsageCostPage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { fetchDocuments, fetchFolders, deleteDocument } from "./lib/api";
import "./index.css";

function AuthenticatedApp() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [authView, setAuthView] = useState("login");

  useEffect(() => {
    document.title = "Cognava | RAG System";
  }, []);

  // Documents & Folders state
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [viewMode, setViewMode] = useState("folder"); // "folder" | "flat"
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocToDelete, setSelectedDocToDelete] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [docs, fds] = await Promise.all([
        fetchDocuments({
          status: statusFilter,
          search: searchQuery,
          folderId: viewMode === "folder" ? selectedFolder || "root" : null,
        }),
        fetchFolders().catch(() => []),
      ]);
      setDocuments(docs);
      setFolders(fds);
      setDocError(null);
    } catch (err) {
      setDocError(err.message || "Failed to load documents");
    } finally {
      setDocLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, statusFilter, searchQuery, selectedFolder, viewMode]);

  // Polling for processing docs
  useEffect(() => {
    if (!isAuthenticated) return;
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, documents]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white border border-[var(--border-light)] shadow-xs flex items-center justify-center text-[var(--info)] relative">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--info)]" />
            <span className="text-xs font-semibold text-[var(--text-heading)]">Loading Cognava...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === "register") return <RegisterPage onNavigate={setAuthView} />;
    if (authView === "join") return <JoinTenantPage onNavigate={setAuthView} />;
    return <LoginPage onNavigate={setAuthView} />;
  }

  const indexedCount = documents.filter((d) => d.status === "indexed" && d.is_active).length;

  const handleDeleteConfirm = async (docId) => {
    setDeleting(true);
    try {
      await deleteDocument(docId);
      setSelectedDocToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      indexedDocCount={indexedCount}
    >
      {activePage === "dashboard" && <DashboardPage onNavigate={setActivePage} />}

      {activePage === "documents" && (
        <div className="w-full space-y-6">
          <DocumentUpload
            folders={folders}
            folderId={selectedFolder}
            onFolderChange={setSelectedFolder}
            onUploadSuccess={loadData}
          />
          <DocumentList
            documents={documents}
            folders={folders}
            loading={docLoading}
            error={docError}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onDeleteClick={(doc) => setSelectedDocToDelete(doc)}
            onPreviewClick={(doc) => setPreviewDoc(doc)}
            onRefresh={loadData}
          />
          <DocumentDeleteModal
            document={selectedDocToDelete}
            isOpen={Boolean(selectedDocToDelete)}
            onClose={() => setSelectedDocToDelete(null)}
            onConfirm={handleDeleteConfirm}
            deleting={deleting}
          />
          <DocumentPreviewModal
            document={previewDoc}
            isOpen={Boolean(previewDoc)}
            onClose={() => setPreviewDoc(null)}
          />
        </div>
      )}

      {activePage === "settings" && <SettingsPage />}
      {activePage === "members" && <MembersPage />}
      {activePage === "usage" && <UsageCostPage />}
      {activePage === "evaluation" && <EvaluationPage />}
      {activePage === "analytics" && <AnalyticsPage />}
      {activePage === "profile" && <ProfilePage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
