import React, { useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchEvaluations, fetchEvaluationSummary, subscribeEvaluationStream } from "../lib/api";
import { CardSkeleton, TableSkeleton } from "../components/ui/Skeleton";

export function EvaluationPage() {
  const [evaluations, setEvaluations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStreamActive, setLiveStreamActive] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    // 1. Initial HTTP load
    const loadInitial = async () => {
      try {
        const [eData, sData] = await Promise.all([
          fetchEvaluations(),
          fetchEvaluationSummary(),
        ]);
        setEvaluations(eData);
        setSummary(sData);
      } catch (err) {
        toast.error("Failed to load evaluations");
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // 2. Subscribe to real-time SSE stream for live updates
    unsubscribe = subscribeEvaluationStream(
      (payload) => {
        if (payload?.data) setEvaluations(payload.data);
        if (payload?.summary) setSummary(payload.summary);
        setLiveStreamActive(true);
      },
      (err) => {
        console.warn("Evaluation SSE stream error, falling back to manual reloads:", err);
        setLiveStreamActive(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <CardSkeleton count={5} />
        <div className="skeuo-raised p-6">
          <TableSkeleton rows={5} cols={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Ragas Averages Summary Cards */}
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

      {/* Evaluations Table */}
      <div className="skeuo-raised overflow-hidden">
        <div className="p-4 border-b border-[var(--border-light)] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-[var(--info)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Evaluation Runs</h3>
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
            <tr>
              <th>Question</th>
              <th>Status</th>
              <th>Faithfulness</th>
              <th>Relevancy</th>
              <th>Precision</th>
              <th>Recall</th>
              <th>Overall</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.length > 0 ? (
              evaluations.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-semibold text-[var(--text-heading)] truncate max-w-xs">
                    {ev.question || "Evaluated RAG Query"}
                  </td>
                  <td>{renderStatusBadge(ev.status)}</td>
                  <td>{formatScore(ev.faithfulness, ev.status)}</td>
                  <td>{formatScore(ev.answer_relevancy, ev.status)}</td>
                  <td>{formatScore(ev.context_precision, ev.status)}</td>
                  <td>{formatScore(ev.context_recall, ev.status)}</td>
                  <td className="font-bold">{formatScore(ev.overall_score, ev.status)}</td>
                  <td className="text-xs text-[var(--text-muted)]">
                    {ev.created_at ? new Date(ev.created_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-xs text-[var(--text-muted)] py-8">
                  No Ragas evaluations recorded yet. Run query evaluations to populate scores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
