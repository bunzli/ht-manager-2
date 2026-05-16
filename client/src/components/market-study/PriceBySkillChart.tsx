import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMoney } from "../../lib/format";
import { SKILL_TYPE_MAP } from "../../lib/skillTypes";
import type { TransferPlayerRow } from "../../lib/types";
import { ANALYTICS_SKILL_STORAGE_KEY } from "../../lib/analyticsFilters";
import type { SpecialtySelection } from "../../lib/analyticsFilters";

interface DataRow {
  level: number;
  noSpecialty: number | null;
  withSpecialty: number | null;
  countNo: number;
  countWith: number;
}

function avg(prices: number[]): number {
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

interface Props {
  /** Already filtered to sold players respecting global filters (incl. specialty). */
  soldPlayers: TransferPlayerRow[];
  /** The specialty filter so we can split "with specialty" correctly. */
  specialtyIds: SpecialtySelection;
}

export function PriceBySkillChart({ soldPlayers, specialtyIds }: Props) {
  const [skillTypeId, setSkillTypeId] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(ANALYTICS_SKILL_STORAGE_KEY);
      if (raw) {
        const n = Number(raw);
        if (SKILL_TYPE_MAP.some((s) => s.id === n)) return n;
      }
    } catch {
      /* ignore */
    }
    return SKILL_TYPE_MAP[0]!.id;
  });

  useEffect(() => {
    try {
      localStorage.setItem(ANALYTICS_SKILL_STORAGE_KEY, String(skillTypeId));
    } catch {
      /* ignore */
    }
  }, [skillTypeId]);

  const field = useMemo(
    () =>
      SKILL_TYPE_MAP.find((s) => s.id === skillTypeId)?.field ?? "scorerSkill",
    [skillTypeId],
  );

  const data = useMemo<DataRow[]>(() => {
    const levels = new Set<number>();
    const getLevel = (p: TransferPlayerRow) =>
      (p.playerDetails as unknown as Record<string, number>)[field] ?? 0;

    for (const p of soldPlayers) levels.add(getLevel(p));

    return Array.from(levels)
      .sort((a, b) => a - b)
      .map((level) => {
        const atLevel = soldPlayers.filter((p) => getLevel(p) === level);
        const noSpec = atLevel.filter((p) => p.playerDetails.specialty === 0);
        const withSpec = atLevel.filter((p) => {
          const s = p.playerDetails.specialty;
          if (s === 0) return false;
          if (specialtyIds === "all") return true;
          return specialtyIds.includes(s);
        });
        const pricesNo = noSpec.map((p) => p.finalPrice!);
        const pricesWith = withSpec.map((p) => p.finalPrice!);
        return {
          level,
          noSpecialty: pricesNo.length > 0 ? avg(pricesNo) : null,
          withSpecialty: pricesWith.length > 0 ? avg(pricesWith) : null,
          countNo: pricesNo.length,
          countWith: pricesWith.length,
        };
      });
  }, [soldPlayers, field, specialtyIds]);

  const skillLabel =
    SKILL_TYPE_MAP.find((s) => s.id === skillTypeId)?.label ?? "Skill";

  const selector = (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500">Skill</label>
      <select
        className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        value={skillTypeId}
        onChange={(e) => setSkillTypeId(Number(e.target.value))}
      >
        {SKILL_TYPE_MAP.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Avg sale price by skill level
          </h3>
          {selector}
        </div>
        <p className="text-sm text-gray-500">
          No sold players match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Avg sale price by {skillLabel} level (no specialty vs with specialty)
        </h3>
        {selector}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="level"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: skillLabel,
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "#9ca3af",
            }}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : `${Math.round(v / 1000)}k`
            }
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={48}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const row = (payload[0] as { payload?: DataRow }).payload;
              return (
                <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs shadow">
                  <p className="font-medium text-gray-800 mb-1">
                    {skillLabel} {String(label)}
                  </p>
                  {(payload as unknown as { name?: unknown; value?: unknown }[]).map(
                    (entry, i) => {
                      const v = entry.value as number | null;
                      const name = String(entry.name ?? "");
                      const c =
                        name === "No specialty"
                          ? row?.countNo ?? 0
                          : row?.countWith ?? 0;
                      return (
                        <p key={i} className="text-gray-600">
                          {name}:{" "}
                          {v == null ? "—" : `${formatMoney(v)} (${c} sold)`}
                        </p>
                      );
                    },
                  )}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="noSpecialty"
            name="No specialty"
            fill="#3b82f6"
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="withSpecialty"
            name="With specialty"
            fill="#f97316"
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
