import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, Cpu, Coins, Zap } from "lucide-react";

export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  searchable = true,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen, searchable]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.subtext && opt.subtext.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="skeuo-inset flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium w-full cursor-pointer bg-white text-[var(--text-heading)] hover:border-[var(--info)] transition-all"
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              <span className="font-bold truncate">{selectedOption.label}</span>
              {selectedOption.tags && (
                <span className="text-[10px] text-[var(--info)] bg-[var(--info-light)] px-1.5 py-0.5 rounded border border-[var(--info-border)] font-mono shrink-0">
                  {selectedOption.tags.context}
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Options List */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-full min-w-[320px] sm:min-w-[420px] bg-white rounded-xl border border-[var(--border-light)] shadow-2xl z-50 py-1 space-y-1 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Search Box */}
          {searchable && options.length > 3 && (
            <div className="p-2.5 border-b border-[var(--border-light)] relative bg-slate-50/50">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search models by name, ID, or specs..."
                className="skeuo-inset pl-8 pr-3 py-1.5 text-xs w-full"
              />
            </div>
          )}

          {/* Options Scroll Container */}
          <div className="max-h-72 overflow-y-auto space-y-1 px-1.5 py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-[var(--text-muted)]">
                No matching models found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`p-3 text-xs font-medium rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[var(--info-light)] border-[var(--info-border)] text-[var(--info)]"
                        : "bg-white border-transparent hover:border-[var(--border-light)] hover:bg-[var(--bg-hover)] text-[var(--text-body)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--text-heading)] truncate text-xs">
                        {option.label}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--info)]" />}
                    </div>

                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                      {option.value}
                    </p>

                    {/* Meta Specs & Pricing Badges */}
                    {option.tags && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                        {/* Context Length */}
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-slate-500" />
                          Ctx: {option.tags.context}
                        </span>

                        {/* Max Output Tokens */}
                        {option.tags.maxOut && (
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <Zap className="h-3 w-3 text-slate-500" />
                            Max Out: {option.tags.maxOut}
                          </span>
                        )}

                        {/* Price In / Out */}
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                          <Coins className="h-3 w-3 text-emerald-600" />
                          In: {option.tags.priceIn} | Out: {option.tags.priceOut}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
