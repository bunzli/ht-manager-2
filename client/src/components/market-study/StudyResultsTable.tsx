import { useMemo, useState } from "react";
import { skillLabel, specialtyLabel, SKILL_KEYS } from "../../lib/skills";
import { formatNumber, formatMoney } from "../../lib/format";
import { displayName, hattrickPlayerUrl } from "../../lib/playerUtils";
import { SKILL_TYPE_TO_FIELD } from "../../lib/skillTypes";
import type { TransferPlayerRow } from "../../lib/types";
import type { StudyFilters } from "../../hooks/useMarketStudy";

type SortKey =
  | "name"
  | "age"
  | "specialty"
  | "tsi"
  | "price"
  | "deadline"
  | (typeof SKILL_KEYS)[number]["key"];
type SortDir = "asc" | "desc";

function parseDeadline(str: string): Date | null {
  if (!str) return null;
  if (str.includes("T") && str.endsWith("Z")) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  try {
    const normalized = str.replace(" ", "T");
    const provisional = new Date(normalized + "Z");
    if (isNaN(provisional.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(provisional);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "00";
    const hour = String(Math.min(parseInt(get("hour"), 10), 23)).padStart(
      2,
      "0",
    );
    const sthlmAsUtc = new Date(
      `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}Z`,
    );
    if (isNaN(sthlmAsUtc.getTime())) return null;
    const offsetMs = sthlmAsUtc.getTime() - provisional.getTime();
    return new Date(provisional.getTime() - offsetMs);
  } catch {
    return null;
  }
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && (
        <span className="ml-1">{currentDir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );
}

function applyFilters(
  players: TransferPlayerRow[],
  filters: StudyFilters,
): TransferPlayerRow[] {
  let list = players;

  if (filters.statusFilter !== "all") {
    list = list.filter((p) =>
      filters.statusFilter === "not_sold"
        ? p.status === "not_sold" || p.status === "expired"
        : p.status === filters.statusFilter,
    );
  }
  if (filters.ageMin) {
    const min = Number(filters.ageMin);
    list = list.filter((p) => p.playerDetails.age >= min);
  }
  if (filters.ageMax) {
    const max = Number(filters.ageMax);
    list = list.filter((p) => p.playerDetails.age <= max);
  }
  if (filters.skillFilter && filters.skillMinLevel) {
    const field = SKILL_TYPE_TO_FIELD[Number(filters.skillFilter)];
    const minLvl = Number(filters.skillMinLevel);
    if (field) {
      list = list.filter(
        (p) =>
          (p.playerDetails as unknown as Record<string, number>)[field] >=
          minLvl,
      );
    }
  }
  if (filters.priceMin) {
    const min = Number(filters.priceMin);
    list = list.filter((p) => {
      const price =
        p.status === "listed"
          ? p.highestBid > 0
            ? p.highestBid
            : p.askingPrice
          : (p.finalPrice ?? 0);
      return price >= min;
    });
  }
  if (filters.priceMax) {
    const max = Number(filters.priceMax);
    list = list.filter((p) => {
      const price =
        p.status === "listed"
          ? p.highestBid > 0
            ? p.highestBid
            : p.askingPrice
          : (p.finalPrice ?? 0);
      return price <= max;
    });
  }
  return list;
}

function sortPlayers(
  list: TransferPlayerRow[],
  sortKey: SortKey,
  sortDir: SortDir,
): TransferPlayerRow[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    const da = a.playerDetails;
    const db = b.playerDetails;

    switch (sortKey) {
      case "name":
        cmp = displayName(da).localeCompare(displayName(db));
        break;
      case "age":
        cmp = da.age * 112 + da.ageDays - (db.age * 112 + db.ageDays);
        break;
      case "specialty":
        cmp = da.specialty - db.specialty;
        break;
      case "tsi":
        cmp = da.tsi - db.tsi;
        break;
      case "price": {
        const priceA =
          a.status === "listed"
            ? a.highestBid > 0
              ? a.highestBid
              : a.askingPrice
            : (a.finalPrice ?? 0);
        const priceB =
          b.status === "listed"
            ? b.highestBid > 0
              ? b.highestBid
              : b.askingPrice
            : (b.finalPrice ?? 0);
        cmp = priceA - priceB;
        break;
      }
      case "deadline":
        cmp = a.deadline.localeCompare(b.deadline);
        break;
      default: {
        const skillField = sortKey as string;
        const va =
          (da as unknown as Record<string, number>)[skillField] ?? 0;
        const vb =
          (db as unknown as Record<string, number>)[skillField] ?? 0;
        cmp = va - vb;
        break;
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
}

interface Props {
  players: TransferPlayerRow[];
  filters: StudyFilters;
  selectedIds: Set<number>;
  onToggleRow: (id: number) => void;
  onToggleAll: (visibleIds: number[]) => void;
}

export function StudyResultsTable({
  players,
  filters,
  selectedIds,
  onToggleRow,
  onToggleAll,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(
    () => sortPlayers(applyFilters(players, filters), sortKey, sortDir),
    [players, filters, sortKey, sortDir],
  );

  const colCount = 1 + 1 + 1 + 1 + 1 + SKILL_KEYS.length + 1 + 1 + 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-2 py-2 w-8">
              {(() => {
                const visibleIds = filtered.map((p) => p.id);
                const allChecked =
                  visibleIds.length > 0 &&
                  visibleIds.every((id) => selectedIds.has(id));
                const someChecked =
                  !allChecked &&
                  visibleIds.some((id) => selectedIds.has(id));
                return (
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={() => onToggleAll(visibleIds)}
                    className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    title={allChecked ? "Deselect all" : "Select all visible"}
                  />
                );
              })()}
            </th>
            <SortHeader
              label="Name"
              sortKey="name"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              className="sticky left-0 bg-gray-50 z-10"
            />
            <SortHeader
              label="Age"
              sortKey="age"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Spec"
              sortKey="specialty"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="TSI"
              sortKey="tsi"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            {SKILL_KEYS.map((s) => (
              <SortHeader
                key={s.key}
                label={s.label.slice(0, 3)}
                sortKey={s.key as SortKey}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
            ))}
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Form
            </th>
            <SortHeader
              label="Price"
              sortKey="price"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Deadline"
              sortKey="deadline"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="text-center py-12 text-gray-400"
              >
                No players match the current filters.
              </td>
            </tr>
          ) : (
            filtered.map((tp) => {
              const d = tp.playerDetails;
              const deadline = tp.deadline
                ? parseDeadline(tp.deadline)
                : null;
              return (
                <tr
                  key={tp.id}
                  className={`hover:bg-gray-50 ${
                    selectedIds.has(tp.id)
                      ? "bg-blue-50/60"
                      : tp.status === "sold"
                        ? "bg-green-50/40"
                        : tp.status === "ended"
                          ? "bg-orange-50/40"
                          : tp.status === "not_sold" ||
                              tp.status === "expired"
                            ? "bg-gray-50/60"
                            : ""
                  }`}
                >
                  <td className="px-2 py-1.5 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tp.id)}
                      onChange={() => onToggleRow(tp.id)}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-inherit">
                    <span className="flex items-center gap-1.5">
                      {tp.status === "listed" ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      ) : (
                        <span className="inline-block w-2 h-2 shrink-0" />
                      )}
                      <a
                        href={hattrickPlayerUrl(tp.playerId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                      >
                        {displayName(d)}
                      </a>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap tabular-nums">
                    {d.age}y {d.ageDays}d
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                    {specialtyLabel(d.specialty) || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 tabular-nums">
                    {formatNumber(d.tsi)}
                  </td>
                  {SKILL_KEYS.map((s) => {
                    const val = (
                      d as unknown as Record<string, number>
                    )[s.key];
                    return (
                      <td
                        key={s.key}
                        className="px-2 py-1.5 text-gray-600 tabular-nums text-center"
                        title={skillLabel(val)}
                      >
                        {val}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-gray-600 tabular-nums text-center">
                    {d.playerForm}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums whitespace-nowrap">
                    {tp.status === "listed" ? (
                      tp.highestBid > 0 ? (
                        <span className="font-bold text-gray-900">
                          {formatMoney(tp.highestBid)}
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          {formatMoney(tp.askingPrice)}
                        </span>
                      )
                    ) : tp.finalPrice !== null ? (
                      <span className="text-green-700 font-medium">
                        {formatMoney(tp.finalPrice)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">
                    {deadline
                      ? deadline.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export { applyFilters };
