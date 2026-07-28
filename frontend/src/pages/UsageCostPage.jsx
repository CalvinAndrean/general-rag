import React, { useEffect, useState } from "react";
import { BarChart3, DollarSign, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchDailyUsage, fetchMonthlyUsage } from "../lib/api";
import { CardSkeleton, Skeleton } from "../components/ui/Skeleton";

export function UsageCostPage() {
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dData, mData] = await Promise.all([
          fetchDailyUsage(),
          fetchMonthlyUsage(),
        ]);
        setDailyData(dData);
        setMonthlyData(mData);
      } catch (err) {
        console.error("Failed to load usage data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <CardSkeleton count={3} />
        <div className="skeuo-raised p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const totalCost = dailyData.reduce((acc, curr) => acc + curr.estimated_cost, 0);
  const totalTokens = dailyData.reduce((acc, curr) => acc + curr.total_tokens, 0);

  return (
    <div className="w-full space-y-6">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="skeuo-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Tokens Used</span>
            <Zap className="h-4 w-4 text-[var(--info)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
            {totalTokens.toLocaleString()}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Prompt & Completion tokens combined</p>
        </div>

        <div className="skeuo-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Estimated Cost</span>
            <DollarSign className="h-4 w-4 text-[var(--warning)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
            ${totalCost.toFixed(4)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Calculated API spend</p>
        </div>

        <div className="skeuo-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Query Logs</span>
            <BarChart3 className="h-4 w-4 text-[var(--success)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
            {dailyData.reduce((acc, curr) => acc + curr.query_count, 0)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">RAG requests processed</p>
        </div>
      </div>

      {/* Daily Tokens Bar Chart */}
      <div className="skeuo-raised p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Daily Token Consumption</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Prompt vs. Completion tokens per day</p>
          </div>
        </div>

        <div className="h-72 w-full">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="date" stroke="#abb0bb" fontSize={11} tickLine={false} />
                <YAxis stroke="#abb0bb" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="prompt_tokens" name="Prompt Tokens" fill="#3b82f6" stackId="a" />
                <Bar dataKey="completion_tokens" name="Completion Tokens" fill="#8b5cf6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
              No daily token usage logged yet
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="skeuo-raised overflow-hidden">
        <div className="p-4 border-b border-[var(--border-light)] bg-white">
          <h3 className="text-sm font-bold text-[var(--text-heading)]">Monthly Cost Breakdown</h3>
        </div>
        <table className="skeuo-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Queries</th>
              <th>Total Tokens</th>
              <th>Cost ($)</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.length > 0 ? (
              monthlyData.map((m) => (
                <tr key={m.month}>
                  <td className="font-semibold text-[var(--text-heading)]">{m.month}</td>
                  <td>{m.query_count}</td>
                  <td>{m.total_tokens.toLocaleString()}</td>
                  <td className="font-mono text-[var(--text-heading)]">${m.estimated_cost.toFixed(4)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[var(--text-muted)] py-6">
                  No monthly cost logs recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
