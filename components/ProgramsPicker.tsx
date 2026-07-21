"use client";

import { useState, useMemo, useRef, useEffect, useId } from "react";
import { PROGRAM_TO_AIRLINE } from "@/lib/costEngine";
import clsx from "clsx";

interface Props {
  value: string; // comma-separated program names
  onChange: (programs: string) => void;
  lang: "fr" | "en";
}

// Get all available program names sorted
const AVAILABLE_PROGRAMS = Object.keys(PROGRAM_TO_AIRLINE).sort();

export function ProgramsPicker({ value, onChange, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const listboxId = `programs-listbox-${uid}`;

  // Parse selected programs from comma-separated value
  const selectedPrograms = useMemo(
    () =>
      value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    [value]
  );

  // Filter available programs: exclude already selected, match query
  const filtered = useMemo(() => {
    const lq = query.toLowerCase().trim();
    if (!lq) {
      return AVAILABLE_PROGRAMS.filter((p) => !selectedPrograms.includes(p));
    }
    return AVAILABLE_PROGRAMS.filter(
      (p) =>
        !selectedPrograms.includes(p) &&
        p.toLowerCase().includes(lq)
    );
  }, [query, selectedPrograms]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const option = listboxRef.current.querySelector<HTMLElement>(
      `[id="${listboxId}-option-${activeIndex}"]`
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const removeProgram = (program: string) => {
    const updated = selectedPrograms.filter((p) => p !== program);
    onChange(updated.join(", "));
  };

  const selectProgram = (program: string) => {
    const updated = [...selectedPrograms, program];
    onChange(updated.join(", "));
    setQuery("");
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== "Enter" && e.key !== "Escape") return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (open && activeIndex >= 0 && filtered[activeIndex]) {
          selectProgram(filtered[activeIndex]);
          setOpen(true);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        break;
      case "Backspace":
        // Delete last selected program when input is empty
        if (!query && selectedPrograms.length > 0) {
          e.preventDefault();
          removeProgram(selectedPrograms[selectedPrograms.length - 1]);
        }
        break;
    }
  };

  const fr = lang === "fr";

  return (
    <div ref={containerRef} className="relative">
      <div
        className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm cursor-text flex flex-wrap items-center gap-1.5 min-h-[44px] hover:border-border focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/25 transition-all"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {/* Selected program tags */}
        {selectedPrograms.map((program) => (
          <div
            key={program}
            className="bg-primary/15 border border-primary/30 text-primary rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1 flex-shrink-0"
          >
            {program}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeProgram(program);
              }}
              className="ml-0.5 hover:text-primary/70 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={selectedPrograms.length === 0 ? (fr ? "Chercher des programmes (ex: Flying Blue)" : "Search programs (e.g., Flying Blue)") : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-fg placeholder:text-muted/40 text-sm"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={open ? listboxId : undefined}
          aria-expanded={open}
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {filtered.map((program, index) => (
            <button
              key={program}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              type="button"
              onClick={() => selectProgram(program)}
              onMouseEnter={() => setActiveIndex(index)}
              className={clsx(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                index === activeIndex
                  ? "bg-primary/15 text-primary"
                  : "text-fg hover:bg-surface-2"
              )}
            >
              {program}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {open && query && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-muted z-50">
          {fr ? "Aucun programme trouvé" : "No programs found"}
        </div>
      )}
    </div>
  );
}
