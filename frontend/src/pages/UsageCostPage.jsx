import React, { useEffect, useState } from "react";
import { BarChart3, DollarSign, Zap, MessageSquare, FileText } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchDailyUsage, fetchMonthlyUsage, fetchUsageSummary } from "../lib/api";
import { CardSkeleton, Skeleton } from "../components/ui/Skeleton";
import { DateRangePicker } from "../components/ui/DateRangePicker";

export function UsageCostPage() {
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, activeUsage] = await Promise.all([
        fetchUsageSummary(startDate || undefined, endDate || undefined),
        viewMode === "daily"
          ? fetchDailyUsage(startDate || undefined, endDate || undefined)
          : fetchMonthlyUsage(startDate || undefined, endDate || undefined),
      ]);
      setSummaryData(sumData);
      if (viewMode === "daily") {
        setDailyData(activeUsage);
      } else {
        setMonthlyData(activeUsage);
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
  const totalLogs = activeData.reduce((acc, curr) => acc + (curr.query_count || 0), 0);

  const queryUsage = summaryData?.query_usage || { estimated_cost: 0, total_tokens: 0, count: 0 };
  const ingestionUsage = summaryData?.ingestion_usage || { estimated_cost: 0, total_tokens: 0, count: 0 };
  const combinedCost = summaryData?.total_cost !== undefined ? summaryData.total_cost : totalCost;
  const combinedTokens = summaryData?.total_tokens !== undefined ? summaryData.total_tokens : totalTokens;

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
          <CardSkeleton count={4} />
          <div className="skeuo-raised p-6 space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : (
        <>
          {/* Top Stat Summary Cards: User Queries vs Document Ingestion Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. User Chat Queries Card */}
            <div className="skeuo-stat-card border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">User Chat Queries</span>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
                ${queryUsage.estimated_cost.toFixed(4)}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {queryUsage.total_tokens.toLocaleString()} tokens ({queryUsage.count} chats)
              </p>
            </div>

            {/* 2. Document Ingestion & OCR Card */}
            <div className="skeuo-stat-card border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Document Ingestion & OCR</span>
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
                ${ingestionUsage.estimated_cost.toFixed(4)}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {ingestionUsage.total_tokens.toLocaleString()} tokens ({ingestionUsage.count} files indexed)
              </p>
            </div>

            {/* 3. Total Combined Cost Card */}
            <div className="skeuo-stat-card border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Combined Cost</span>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
                ${combinedCost.toFixed(4)}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Query + Ingestion spend</p>
            </div>

            {/* 4. Total Tokens Used Card */}
            <div className="skeuo-stat-card border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Tokens Used</span>
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-heading)] mt-3">
                {combinedTokens.toLocaleString()}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Prompt & Completion tokens</p>
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
                  <th>Activity Logs</th>
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
