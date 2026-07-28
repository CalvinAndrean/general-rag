import React, { useEffect, useState } from "react";
import { TrendingUp, MessageSquare, Flame } from "lucide-react";
import { fetchTopQuestions, fetchQueryTrends } from "../lib/api";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function AnalyticsPage() {
  const [topQuestions, setTopQuestions] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qData, tData] = await Promise.all([
          fetchTopQuestions(),
          fetchQueryTrends(),
        ]);
        setTopQuestions(qData);
        setTrends(tData);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="skeuo-raised p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="skeuo-raised p-6">
          <TableSkeleton rows={5} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 30-Day Query Volume Trend */}
      <div className="skeuo-raised p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Query Volume History</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Daily question traffic over time</p>
          </div>
          <TrendingUp className="h-4 w-4 text-[var(--info)]" />
        </div>

        <div className="h-64 w-full">
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#abb0bb" fontSize={11} tickLine={false} />
                <YAxis stroke="#abb0bb" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="query_count" stroke="#8b5cf6" strokeWidth={2} fill="url(#analyticsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Most Asked Questions */}
      <div className="skeuo-raised overflow-hidden">
        <div className="p-4 border-b border-[var(--border-light)] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[var(--warning)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Most Frequently Asked Questions</h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">Question clustering & repetition</span>
        </div>

        <table className="skeuo-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Question</th>
              <th>Occurrences</th>
              <th>Last Asked</th>
            </tr>
          </thead>
          <tbody>
            {topQuestions.length > 0 ? (
              topQuestions.map((q, idx) => (
                <tr key={idx}>
                  <td className="font-bold text-[var(--text-secondary)]">#{idx + 1}</td>
                  <td className="font-semibold text-[var(--text-heading)]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-[var(--info)] shrink-0" />
                      <span>{q.question}</span>
                    </div>
                  </td>
                  <td>
                    <span className="skeuo-badge skeuo-badge-info font-mono">{q.count} times</span>
                  </td>
                  <td className="text-xs text-[var(--text-muted)]">
                    {q.last_asked ? new Date(q.last_asked).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[var(--text-muted)] py-8">
                  No question frequency data recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
