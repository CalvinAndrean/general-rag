import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full space-y-3 p-4 bg-white rounded-2xl border border-[var(--border-light)]">
      <div className="flex items-center gap-4 pb-3 border-b border-[var(--border-light)]">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <Skeleton
            key={cIdx}
            className={`h-4 ${cIdx === 0 ? "w-40" : cIdx === cols - 1 ? "w-20 ml-auto" : "w-24"}`}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-none">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <Skeleton
              key={cIdx}
              className={`h-4 ${cIdx === 0 ? "w-48" : cIdx === cols - 1 ? "w-16 ml-auto" : "w-20"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3, gridClassName = "" }) {
  const defaultGrid =
    count === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      : count === 5
      ? "grid-cols-2 lg:grid-cols-5 gap-4"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5";

  return (
    <div className={`grid ${gridClassName || defaultGrid}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeuo-stat-card space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
