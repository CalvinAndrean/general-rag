import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="skeuo-inset flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-medium w-full cursor-pointer bg-white text-[var(--text-heading)] hover:border-[var(--info)] transition-all"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Options List */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-full min-w-[160px] bg-white rounded-xl border border-[var(--border-light)] shadow-xl z-50 py-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[var(--info-light)] text-[var(--info)] font-bold"
                    : "text-[var(--text-body)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-heading)]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
