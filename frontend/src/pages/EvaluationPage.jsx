import React, { useEffect, useState } from "react";
import { BookOpen, Eye, FlaskConical, HelpCircle, Loader2, MessageSquare, ShieldAlert, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { fetchEvaluations, fetchEvaluationSummary, subscribeEvaluationStream } from "../lib/api";
import { CardSkeleton, TableSkeleton } from "../components/ui/Skeleton";

export function EvaluationPage() {
  const [activeTab, setActiveTab] = useState("knowledge_query"); // "knowledge_query" | "intent_handling"
  const [evaluations, setEvaluations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null); // For Reasoning Modal

  useEffect(() => {
    let unsubscribe = () => {};

    const loadData = async () => {
      setLoading(true);
      try {
        const [eData, sData] = await Promise.all([
          fetchEvaluations(activeTab),
          fetchEvaluationSummary(activeTab),
        ]);
        setEvaluations(eData);
        setSummary(sData);
      } catch (err) {
        toast.error("Failed to load evaluations");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to SSE stream for live updates
    unsubscribe = subscribeEvaluationStream(
      (payload) => {
        if (payload?.data) {
          const filteredData = payload.data.filter(
            (item) => item.evaluation_type === activeTab
          );
          setEvaluations(filteredData);
        }
        if (payload?.summary) setSummary(payload.summary);
        setLiveStreamActive(true);
      },
      (err) => {
        console.warn("Evaluation SSE stream warning:", err);
        setLiveStreamActive(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab]);

  const renderStatusBadge = (status) => {
    const st = (status || "COMPLETED").toUpperCase();
    if (st === "EVALUATING") {
      return (
        <span className="skeuo-badge skeuo-badge-warning animate-pulse inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
          Evaluating...
        </span>
      );
    }
    if (st === "FAILED") {
      return <span className="skeuo-badge skeuo-badge-error">Failed</span>;
    }
    if (st === "PENDING") {
      return <span className="skeuo-badge bg-gray-100 text-gray-600">Queued</span>;
    }
    return <span className="skeuo-badge skeuo-badge-success">Completed</span>;
  };

  const renderIntentBadge = (intent) => {
    const it = (intent || "knowledge_query").toLowerCase();
    if (it === "greeting") {
      return (
        <span className="skeuo-badge bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1 font-semibold">
          <MessageSquare className="h-3 w-3" />
          Greeting
        </span>
      );
    }
    if (it === "out_of_scope") {
      return (
        <span className="skeuo-badge bg-amber-50 text-amber-700 border-amber-200 inline-flex items-center gap-1 font-semibold">
          <ShieldAlert className="h-3 w-3" />
          Out of Scope
        </span>
      );
    }
    if (it === "unclear") {
      return (
        <span className="skeuo-badge bg-purple-50 text-purple-700 border-purple-200 inline-flex items-center gap-1 font-semibold">
          <HelpCircle className="h-3 w-3" />
          Unclear Query
        </span>
      );
    }
    return (
      <span className="skeuo-badge bg-blue-50 text-blue-700 border-blue-200 inline-flex items-center gap-1 font-semibold">
        <BookOpen className="h-3 w-3" />
        Knowledge Query
      </span>
    );
  };

  const formatScore = (val, status) => {
    if (status === "EVALUATING" || status === "PENDING") {
      return <span className="text-xs text-[var(--text-muted)] italic">evaluating...</span>;
    }
    if (val === null || val === undefined) return "-";
    const num = Math.round(val * 100);
    let colorClass = "skeuo-badge-success";
    if (val < 0.5) colorClass = "skeuo-badge-error";
    else if (val < 0.8) colorClass = "skeuo-badge-warning";
    return <span className={`skeuo-badge ${colorClass}`}>{num}%</span>;
  };

  return (
    <div className="w-full space-y-6">
      {/* Tab Switcher: Knowledge Query vs Intent Handling */}
      <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-2">
        <button
          onClick={() => setActiveTab("knowledge_query")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "knowledge_query"
              ? "bg-[var(--info)] text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Knowledge Query Ragas Evaluation
        </button>
        <button
          onClick={() => setActiveTab("intent_handling")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "intent_handling"
              ? "bg-[var(--info)] text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Intent Handling Evaluation
        </button>
      </div>

      {loading ? (
        <div className="w-full space-y-6">
          <CardSkeleton count={4} />
          <div className="skeuo-raised p-6">
            <TableSkeleton rows={5} cols={8} />
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {activeTab === "knowledge_query" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="skeuo-stat-card text-center p-4">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Faithfulness</span>
                <div className="text-xl font-bold text-[var(--text-heading)] mt-1">
                  {summary?.avg_faithfulness ? `${Math.round(summary.avg_faithfulness * 100)}%` : "-"}
                </div>
              </div>

              <div className="skeuo-stat-card text-center p-4">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Answer Relevancy</span>
                <div className="text-xl font-bold text-[var(--text-heading)] mt-1">
                  {summary?.avg_answer_relevancy ? `${Math.round(summary.avg_answer_relevancy * 100)}%` : "-"}
                </div>
              </div>

              <div className="skeuo-stat-card text-center p-4">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Context Precision</span>
                <div className="text-xl font-bold text-[var(--text-heading)] mt-1">
                  {summary?.avg_context_precision ? `${Math.round(summary.avg_context_precision * 100)}%` : "-"}
                </div>
              </div>

              <div className="skeuo-stat-card text-center p-4">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Context Recall</span>
                <div className="text-xl font-bold text-[var(--text-heading)] mt-1">
                  {summary?.avg_context_recall ? `${Math.round(summary.avg_context_recall * 100)}%` : "-"}
                </div>
              </div>

              <div className="skeuo-stat-card text-center p-4 bg-[var(--info-light)] border-[var(--info-border)]">
                <span className="text-[11px] font-semibold text-[var(--info)]">Overall Score</span>
                <div className="text-xl font-extrabold text-[var(--info)] mt-1">
                  {summary?.avg_overall_score ? `${Math.round(summary.avg_overall_score * 100)}%` : "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="skeuo-stat-card text-center p-4">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Intent Accuracy</span>
                <div className="text-xl font-bold text-[var(--text-heading)] mt-1">
                  {summary?.avg_faithfulness ? `${Math.round(summary.avg_faithfulness * 100)}%` : "-"}
                </div>
              </div>

              <div className="skeuo-stat-card text-center p-4">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Response Tone & Politeness</span>
                <div className="text-xl font-bold text-[var(--text-heading)] mt-1">
                  {summary?.avg_answer_relevancy ? `${Math.round(summary.avg_answer_relevancy * 100)}%` : "-"}
                </div>
              </div>

              <div className="skeuo-stat-card text-center p-4 bg-[var(--info-light)] border-[var(--info-border)]">
                <span className="text-[11px] font-semibold text-[var(--info)]">Overall Score</span>
                <div className="text-xl font-extrabold text-[var(--info)] mt-1">
                  {summary?.avg_overall_score ? `${Math.round(summary.avg_overall_score * 100)}%` : "-"}
                </div>
              </div>
            </div>
          )}

          {/* Evaluations Table */}
          <div className="skeuo-raised overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-[var(--info)]" />
                <h3 className="text-sm font-bold text-[var(--text-heading)]">
                  {activeTab === "knowledge_query"
                    ? "Knowledge Query Evaluation Runs"
                    : "Intent Handling Evaluation Runs"}
                </h3>
                {liveStreamActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live SSE
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Total runs: {summary?.total_evaluations || 0}
              </span>
            </div>

            <table className="skeuo-table">
              <thead>
                {activeTab === "knowledge_query" ? (
                  <tr>
                    <th>Question</th>
                    <th>Status</th>
                    <th>Faithfulness</th>
                    <th>Relevancy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>Overall</th>
                    <th>Reasoning</th>
                    <th>Date</th>
                  </tr>
                ) : (
                  <tr>
                    <th>User Message</th>
                    <th>Intent Flag</th>
                    <th>Status</th>
                    <th>Intent Accuracy</th>
                    <th>Response Tone</th>
                    <th>Overall Score</th>
                    <th>Reasoning</th>
                    <th>Date</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {evaluations.length > 0 ? (
                  evaluations.map((ev) => (
                    <tr key={ev.id}>
                      <td className="font-semibold text-[var(--text-heading)] truncate max-w-xs">
                        {ev.question || "Evaluated Query"}
                      </td>
                      {activeTab === "intent_handling" && <td>{renderIntentBadge(ev.intent)}</td>}
                      <td>{renderStatusBadge(ev.status)}</td>
                      {activeTab === "knowledge_query" ? (
                        <>
                          <td>{formatScore(ev.faithfulness, ev.status)}</td>
                          <td>{formatScore(ev.answer_relevancy, ev.status)}</td>
                          <td>{formatScore(ev.context_precision, ev.status)}</td>
                          <td>{formatScore(ev.context_recall, ev.status)}</td>
                        </>
                      ) : (
                        <>
                          <td>{formatScore(ev.faithfulness, ev.status)}</td>
                          <td>{formatScore(ev.answer_relevancy, ev.status)}</td>
                        </>
                      )}
                      <td className="font-bold">{formatScore(ev.overall_score, ev.status)}</td>
                      <td>
                        <button
                          onClick={() => setSelectedEval(ev)}
                          className="skeuo-btn skeuo-btn-sm text-[11px] font-bold px-3 py-1 cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                          View
                        </button>
                      </td>
                      <td className="text-xs text-[var(--text-muted)]">
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={activeTab === "knowledge_query" ? 9 : 8}
                      className="text-center text-xs text-[var(--text-muted)] py-8"
                    >
                      {activeTab === "knowledge_query"
                        ? "No Ragas knowledge query evaluations recorded yet."
                        : "No intent handling evaluations recorded yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 3D Skeuomorphic Reasoning Modal Popup */}
      {selectedEval && (
        <div
          className="skeuo-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEval(null);
          }}
        >
          <div className="skeuo-modal-card">
            {/* Glossy Metallic Header */}
            <div className="skeuo-modal-header">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
                  <FlaskConical className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">
                    LLM Evaluation Reasoning
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    LLM-as-a-Judge Quality Insights
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEval(null)}
                className="skeuo-btn skeuo-btn-sm p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="skeuo-modal-body">
              {/* User Question */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  User Question / Input Prompt
                </span>
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-mono text-[12px] leading-relaxed shadow-inner">
                  {selectedEval.question || "N/A"}
                </div>
              </div>

              {/* Intent & Overall Score Summary Bar */}
              <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-slate-50 via-white to-slate-100 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Intent Flag:</span>
                  {renderIntentBadge(selectedEval.intent)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Overall Score:</span>
                  {formatScore(selectedEval.overall_score, selectedEval.status)}
                </div>
              </div>

              {/* Metrics Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Detailed Metric Scores
                </span>
                {selectedEval.evaluation_type === "knowledge_query" ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                      <span className="text-slate-600 font-semibold">Faithfulness:</span>
                      {formatScore(selectedEval.faithfulness, selectedEval.status)}
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                      <span className="text-slate-600 font-semibold">Answer Relevancy:</span>
                      {formatScore(selectedEval.answer_relevancy, selectedEval.status)}
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                      <span className="text-slate-600 font-semibold">Context Precision:</span>
                      {formatScore(selectedEval.context_precision, selectedEval.status)}
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                      <span className="text-slate-600 font-semibold">Context Recall:</span>
                      {formatScore(selectedEval.context_recall, selectedEval.status)}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                      <span className="text-slate-600 font-semibold">Intent Accuracy:</span>
                      {formatScore(selectedEval.faithfulness, selectedEval.status)}
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                      <span className="text-slate-600 font-semibold">Response Tone:</span>
                      {formatScore(selectedEval.answer_relevancy, selectedEval.status)}
                    </div>
                  </div>
                )}
              </div>

              {/* LLM Reasoning Explanation */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-blue-500" />
                  LLM-as-a-Judge Reasoning & Explanation
                </span>
                <div className="p-4 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-slate-50 border-l-4 border-blue-600 border border-blue-200 rounded-xl text-xs text-slate-800 leading-relaxed italic shadow-xs">
                  "{selectedEval.reasoning || "Evaluation completed successfully by LLM-as-a-Judge."}"
                </div>
              </div>
            </div>

            {/* Modal Footer with 3D Primary Button */}
            <div className="skeuo-modal-footer">
              <button
                onClick={() => setSelectedEval(null)}
                className="skeuo-btn skeuo-btn-primary px-6 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
