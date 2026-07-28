import React, { useEffect, useState } from "react";
import {
  FileText,
  MessageSquare,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fetchDashboardStats, fetchQueryTrends } from "../lib/api";
import { CardSkeleton, Skeleton } from "../components/ui/Skeleton";

export function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sData, tData] = await Promise.all([
          fetchDashboardStats(),
          fetchQueryTrends(),
        ]);
        setStats(sData);
        setTrends(tData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 w-full">
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeuo-raised p-6 space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="skeuo-raised p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: "Indexed", value: stats?.indexed_documents || 0, color: "#22c55e" },
    { name: "Processing", value: stats?.processing_documents || 0, color: "#f59e0b" },
    { name: "Failed", value: stats?.failed_documents || 0, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8 w-full">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Documents */}
        <div className="skeuo-stat-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Documents</span>
            <div className="h-8 w-8 rounded-lg bg-[var(--info-light)] text-[var(--info)] flex items-center justify-center border border-[var(--info-border)]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {stats?.total_documents || 0}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
              <span className="text-[var(--success)] font-medium">{stats?.indexed_documents || 0} indexed</span>
              <span>•</span>
              <span>{stats?.processing_documents || 0} processing</span>
            </p>
          </div>
        </div>

        {/* Card 2: Today's Queries */}
        <div className="skeuo-stat-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Queries Today</span>
            <div className="h-8 w-8 rounded-lg bg-[var(--success-light)] text-[var(--success)] flex items-center justify-center border border-[var(--success-border)]">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              {stats?.queries_today || 0}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Total lifetime: <span className="font-semibold text-[var(--text-body)]">{stats?.total_queries || 0}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Monthly Cost */}
        <div className="skeuo-stat-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Cost This Month</span>
            <div className="h-8 w-8 rounded-lg bg-[var(--warning-light)] text-[var(--warning)] flex items-center justify-center border border-[var(--warning-border)]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[var(--text-heading)]">
              ${(stats?.cost_this_month || 0).toFixed(4)}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Estimated spend</p>
          </div>
        </div>

        {/* Card 4: Quick Action */}
        <div className="skeuo-stat-card bg-gradient-to-br from-white to-[#f8fafc] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Document Management</span>
            <FileText className="h-4 w-4 text-[var(--info)]" />
          </div>
          <div className="mt-4">
            <p className="text-xs text-[var(--text-body)] mb-3">Upload & manage your knowledge base</p>
            <button
              onClick={() => onNavigate("documents")}
              className="skeuo-btn skeuo-btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              Manage Documents
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queries Trend Area Chart */}
        <div className="lg:col-span-2 skeuo-raised p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-heading)]">Query Activity Trend</h3>
              <p className="text-[11px] text-[var(--text-muted)]">RAG search queries over the last 30 days</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>

          <div className="h-64 w-full">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#abb0bb" fontSize={11} tickLine={false} />
                  <YAxis stroke="#abb0bb" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e4e6eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="query_count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#queryGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                No query trends data available yet
              </div>
            )}
          </div>
        </div>

        {/* Indexing Status Pie Chart */}
        <div className="skeuo-raised p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Indexing Status</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Breakdown of uploaded document statuses</p>
          </div>

          <div className="h-48 w-full my-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                No document status data
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-1.5 border-t border-[var(--border-light)] pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--text-body)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> Indexed
              </span>
              <span className="font-bold text-[var(--text-heading)]">{stats?.indexed_documents || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--text-body)]">
                <Clock className="h-3.5 w-3.5 text-[var(--warning)]" /> Processing
              </span>
              <span className="font-bold text-[var(--text-heading)]">{stats?.processing_documents || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--text-body)]">
                <AlertTriangle className="h-3.5 w-3.5 text-[var(--error)]" /> Failed
              </span>
              <span className="font-bold text-[var(--text-heading)]">{stats?.failed_documents || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
