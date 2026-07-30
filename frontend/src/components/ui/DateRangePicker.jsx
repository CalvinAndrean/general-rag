import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, Check } from "lucide-react";

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState("custom");
  const containerRef = useRef(null);

  // Parse YYYY-MM-DD strings into Date objects or current month
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateObj) => {
    if (!dateObj) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handlePresetSelect = (presetKey) => {
    setPreset(presetKey);
    const now = new Date();
    let start = null;
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (presetKey === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (presetKey === "7days") {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (presetKey === "30days") {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
    } else if (presetKey === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (presetKey === "lastMonth") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (presetKey === "all") {
      start = null;
      end = null;
    }

    onRangeChange(start ? formatDate(start) : "", end ? formatDate(end) : "");
    if (presetKey !== "custom") setIsOpen(false);
  };

  const handleDateClick = (dayDate) => {
    const clickedStr = formatDate(dayDate);
    if (!startDate || (startDate && endDate)) {
      onRangeChange(clickedStr, "");
      setPreset("custom");
    } else if (startDate && !endDate) {
      if (new Date(clickedStr) < new Date(startDate)) {
        onRangeChange(clickedStr, "");
      } else {
        onRangeChange(startDate, clickedStr);
        setIsOpen(false);
      }
    }
  };

  // Generate calendar grid days for currentMonth
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDayOfWeek = startOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const totalDays = endOfMonth.getDate();

  const prevMonthDays = [];
  const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(prevMonthLastDay - i);
  }

  const daysInMonth = [];
  for (let i = 1; i <= totalDays; i++) {
    daysInMonth.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Date Range Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="skeuo-inset flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white text-[var(--text-heading)] hover:border-[var(--info)] transition-all cursor-pointer rounded-xl"
      >
        <CalendarIcon className="h-4 w-4 text-[var(--info)]" />
        <span>
          {startDate && endDate
            ? `${startDate} ~ ${endDate}`
            : startDate
            ? `From ${startDate}`
            : endDate
            ? `Until ${endDate}`
            : "Select Date Range"}
        </span>
      </button>

      {/* Popover Calendar & Presets */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-2xl border border-[var(--border-light)] shadow-2xl z-50 p-4 w-[340px] sm:w-[460px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Presets Sidebar */}
            <div className="sm:w-36 flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-[var(--border-light)] pb-3 sm:pb-0 sm:pr-3 text-xs">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-1 px-2">
                Presets
              </span>
              {[
                { id: "7days", label: "Last 7 Days" },
                { id: "30days", label: "Last 30 Days" },
                { id: "thisMonth", label: "This Month" },
                { id: "lastMonth", label: "Last Month" },
                { id: "all", label: "All Time" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id)}
                  className={`text-left px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                    preset === p.id
                      ? "bg-[var(--info-light)] text-[var(--info)] font-bold"
                      : "text-[var(--text-body)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar Main Grid */}
            <div className="flex-1 space-y-3">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                    )
                  }
                  className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-xs font-bold text-[var(--text-heading)]">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                    )
                  }
                  className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[var(--text-muted)]">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Previous month padding days */}
                {prevMonthDays.map((d, i) => (
                  <div key={`prev-${i}`} className="py-1 text-[var(--border-medium)] opacity-40 font-mono">
                    {d}
                  </div>
                ))}

                {/* Current month days */}
                {daysInMonth.map((dObj) => {
                  const dStr = formatDate(dObj);
                  const isStart = dStr === startDate;
                  const isEnd = dStr === endDate;
                  const isInRange =
                    startDate &&
                    endDate &&
                    new Date(dStr) >= new Date(startDate) &&
                    new Date(dStr) <= new Date(endDate);

                  return (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => handleDateClick(dObj)}
                      className={`py-1 rounded-lg font-medium cursor-pointer transition-all ${
                        isStart || isEnd
                          ? "bg-[var(--info)] text-white font-bold shadow-xs"
                          : isInRange
                          ? "bg-[var(--info-light)] text-[var(--info)] font-semibold"
                          : "text-[var(--text-heading)] hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      {dObj.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2 mt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onRangeChange("", "");
                    setPreset("custom");
                  }}
                  className="text-[11px] font-semibold text-[var(--error)] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="skeuo-btn skeuo-btn-primary px-3 py-1 text-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
