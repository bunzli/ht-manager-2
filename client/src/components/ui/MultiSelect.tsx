import { useCallback, useEffect, useRef, useState } from "react";

export interface MultiSelectOption {
  id: number;
  label: string;
}

interface Props {
  label: string;
  options: MultiSelectOption[];
  /** IDs that are currently selected. Empty set → treated as "all selected". */
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  /** Select only this one option, deselecting all others. */
  onSelectOnly: (id: number) => void;
  placeholder?: string;
}

function Checkmark() {
  return (
    <svg
      viewBox="0 0 10 8"
      className="w-2.5 h-2.5 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1,4 4,7 9,1" />
    </svg>
  );
}

function buildTriggerText(
  selectedIds: Set<number>,
  options: MultiSelectOption[],
): { value: string; count: number | null } {
  const allSelected = selectedIds.size === options.length;
  if (allSelected || selectedIds.size === 0) {
    return { value: "All", count: null };
  }
  if (selectedIds.size === 1) {
    const id = Array.from(selectedIds)[0]!;
    const found = options.find((o) => o.id === id);
    return { value: found?.label ?? String(id), count: null };
  }
  const first = options.find((o) => selectedIds.has(o.id))!;
  return { value: first.label, count: selectedIds.size };
}

export function MultiSelect({
  label,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onSelectOnly,
  placeholder = "Type to search…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allSelected = selectedIds.size === options.length;

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHoveredId(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const { value, count } = buildTriggerText(selectedIds, options);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-w-[160px] max-w-[280px]"
      >
        <span className="flex-1 text-left truncate">
          <span className="font-medium">{label}:</span>{" "}
          <span className="text-gray-600">{value}</span>
        </span>
        {count !== null && (
          <span className="flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5 leading-none">
            ({count})
          </span>
        )}
        <svg
          className={`flex-shrink-0 w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          {/* Header — select all */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-150"
            onClick={onSelectAll}
          >
            <span
              className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                allSelected
                  ? "bg-gray-700 border-gray-700"
                  : "border-gray-400 bg-white"
              }`}
            >
              {allSelected && <Checkmark />}
            </span>
            <span className="text-sm font-semibold text-gray-800 truncate flex-1">
              {allSelected ? "All" : count !== null ? `${count} selected` : value}
            </span>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <svg
              className="flex-shrink-0 w-3.5 h-3.5 text-gray-400"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="14.5" y2="14.5" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : (
              filtered.map((opt) => {
                const checked = selectedIds.has(opt.id);
                const hovered = hoveredId === opt.id;
                return (
                  <li
                    key={opt.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 select-none group"
                    onMouseEnter={() => setHoveredId(opt.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Checkbox — toggle */}
                    <button
                      type="button"
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                      onClick={() => onToggle(opt.id)}
                    >
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          checked
                            ? "bg-gray-700 border-gray-700"
                            : "border-gray-300 bg-white group-hover:border-gray-400"
                        }`}
                      >
                        {checked && <Checkmark />}
                      </span>
                      <span className="text-sm text-gray-700 truncate text-left">
                        {opt.label}
                      </span>
                    </button>

                    {/* "Only" button — appears on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOnly(opt.id);
                      }}
                      className={`flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-opacity px-1 ${
                        hovered ? "opacity-100" : "opacity-0"
                      }`}
                      tabIndex={hovered ? 0 : -1}
                    >
                      only
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
