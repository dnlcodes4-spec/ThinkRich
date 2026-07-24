"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type SelectOption = { id: string; name: string };

// Cap the rendered matches so a very long list (e.g. polling units) never mounts
// thousands of nodes at once. Typing narrows it well below this.
const RENDER_CAP = 100;

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/**
 * A searchable single-select. The chosen id is submitted through a hidden input
 * named `name`, so it drops into a plain `<form action={serverAction}>` with no
 * extra wiring. Keyboard: type to filter, Up/Down to move, Enter to choose,
 * Escape to close. Accessible listbox pattern with `aria-activedescendant`.
 */
export function SearchSelect({
  name,
  label,
  options,
  placeholder = "Search…",
  required,
  error,
  defaultValue = "",
}: {
  name: string;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [selectedId, setSelectedId] = useState(defaultValue);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const baseId = useId();
  const listId = `${baseId}-list`;
  const labelId = `${baseId}-label`;
  const errorId = `${baseId}-error`;

  const selected = options.find((o) => o.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, RENDER_CAP);
    const matches: SelectOption[] = [];
    for (const o of options) {
      if (o.name.toLowerCase().includes(q)) {
        matches.push(o);
        if (matches.length >= RENDER_CAP) break;
      }
    }
    return matches;
  }, [options, query]);

  const truncated = filtered.length >= RENDER_CAP;

  // Focus the search field when the popup opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openMenu() {
    setOpen(true);
    setQuery("");
    // Start on the currently-selected option if it is visible.
    const idx = selected ? options.findIndex((o) => o.id === selected.id) : 0;
    setActive(idx >= 0 && idx < RENDER_CAP ? idx : 0);
  }

  function choose(opt: SelectOption) {
    setSelectedId(opt.id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtered.length - 1);
    }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      {label ? (
        <span id={labelId} className="text-sm font-semibold text-foreground">
          {label}
        </span>
      ) : null}

      {/* The chosen id travels with the form. */}
      <input type="hidden" name={name} value={selectedId} required={required} />

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? `${labelId} ${baseId}-value` : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-2 rounded-sm border bg-surface px-3 text-left text-base focus:outline-2 focus:outline-offset-1 focus:outline-ring",
            error ? "border-danger" : "border-border",
          )}
        >
          <span id={`${baseId}-value`} className={cn("truncate", selected ? "text-foreground" : "text-muted")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronIcon />
        </button>

        {open ? (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <SearchIcon />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={filtered[active] ? `${baseId}-opt-${active}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={placeholder}
                className="min-h-11 w-full bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>

            <ul ref={listRef} id={listId} role="listbox" aria-labelledby={label ? labelId : undefined} className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted">No matches for “{query}”.</li>
              ) : (
                filtered.map((opt, i) => {
                  const isActive = i === active;
                  const isSelected = opt.id === selectedId;
                  return (
                    <li
                      key={opt.id}
                      id={`${baseId}-opt-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(opt)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm",
                        isActive ? "bg-primary/10 text-foreground" : "text-foreground",
                      )}
                    >
                      <span className="truncate">{opt.name}</span>
                      {isSelected ? <span className="text-xs font-semibold text-primary">Selected</span> : null}
                    </li>
                  );
                })
              )}
              {truncated ? (
                <li className="px-3 py-2 text-xs text-muted">Showing the first {RENDER_CAP}. Keep typing to narrow it down.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
          <span aria-hidden="true">✕</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
