import React, { useEffect, useState } from "react";
import { BarChart3, DollarSign, Zap, Calendar, Filter } from "lucide-react";
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
import { DateRangePicker } from "../components/ui/DateRangePicker";

export function UsageCostPage() {
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === "daily") {
        const dData = await fetchDailyUsage(startDate || undefined, endDate || undefined);
        setDailyData(dData);
      } else {
        const mData = await fetchMonthlyUsage(startDate || undefined, endDate || undefined);
        setMonthlyData(mData);
      }
    } catch (err) {
      console.error("Failed to load usage data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, startDate, endDate]);

  const activeData = viewMode === "daily" ? dailyData : monthlyData;
  const totalCost = activeData.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
  const totalTokens = activeData.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
  const totalQueries = activeData.reduce((acc, curr) => acc + (curr.query_count || 0), 0);

  return (
    <div className="w-full space-y-6">
      {/* Date Range & Mode Controls Header */}
      <div className="skeuo-raised p-4 flex flex-wrap items-center justify-between gap-4 bg-white">
        {/* Mode Toggle */}
        <div className="flex items-center bg-[var(--bg-hover)] p-0.5 rounded-lg border border-[var(--border-light)] text-xs">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
              viewMode === "daily"
                ? "bg-white shadow-xs text-[var(--text-heading)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-heading)]"
            }`}
          >
            Daily Breakdown
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
              viewMode === "monthly"
                ? "bg-white shadow-xs text-[var(--text-heading)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-heading)]"
            }`}
          >
            Monthly Aggregation
          </button>
        </div>

        {/* Custom Shadcn Date Range Picker */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      {loading ? (
        <div className="w-full space-y-6">
          <CardSkeleton count={3} />
          <div className="skeuo-raised p-6 space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : (
        <>
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
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Calculated Cost</span>
                <DollarSign className="h-4 w-4 text-[var(--warning)]" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
                ${totalCost.toFixed(4)}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">AI API Provider Spend</p>
            </div>

            <div className="skeuo-stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Query Logs</span>
                <BarChart3 className="h-4 w-4 text-[var(--success)]" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
                {totalQueries}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">RAG requests processed</p>
            </div>
          </div>

          {/* Usage Chart */}
          <div className="skeuo-raised p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-heading)]">
                  {viewMode === "daily" ? "Daily Token Consumption" : "Monthly Token Consumption"}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {viewMode === "daily"
                    ? "Prompt vs. Completion tokens per day"
                    : "Aggregated monthly token usage"}
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              {activeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeData}>
                    <XAxis
                      dataKey={viewMode === "daily" ? "date" : "month"}
                      stroke="#abb0bb"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#abb0bb" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    {viewMode === "daily" ? (
                      <>
                        <Bar dataKey="prompt_tokens" name="Prompt Tokens" fill="#3b82f6" stackId="a" />
                        <Bar dataKey="completion_tokens" name="Completion Tokens" fill="#8b5cf6" stackId="a" />
                      </>
                    ) : (
                      <Bar dataKey="total_tokens" name="Total Tokens" fill="#3b82f6" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                  No usage data recorded for the selected date range
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="skeuo-raised overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] bg-white">
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                {viewMode === "daily" ? "Daily Cost Breakdown" : "Monthly Cost Breakdown"}
              </h3>
            </div>
            <table className="skeuo-table">
              <thead>
                <tr>
                  <th>{viewMode === "daily" ? "Date" : "Month"}</th>
                  <th>Queries</th>
                  <th>Total Tokens</th>
                  <th>Cost ($)</th>
                </tr>
              </thead>
              <tbody>
                {activeData.length > 0 ? (
                  activeData.map((item) => (
                    <tr key={viewMode === "daily" ? item.date : item.month}>
                      <td className="font-semibold text-[var(--text-heading)]">
                        {viewMode === "daily" ? item.date : item.month}
                      </td>
                      <td>{item.query_count}</td>
                      <td>{(item.total_tokens || 0).toLocaleString()}</td>
                      <td className="font-mono text-[var(--text-heading)]">
                        ${(item.estimated_cost || 0).toFixed(4)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-xs text-[var(--text-muted)] py-6">
                      No usage logs recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
