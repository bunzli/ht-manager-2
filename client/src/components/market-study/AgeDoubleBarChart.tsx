import { useMemo } from "react";
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
import type { TransferPlayerRow } from "../../lib/types";
import type { SpecialtySelection } from "../../lib/analyticsFilters";

function avgPrice(rows: TransferPlayerRow[]): { avg: number; count: number } {
  if (rows.length === 0) return { avg: 0, count: 0 };
  const sum = rows.reduce((s, p) => s + (p.finalPrice ?? 0), 0);
  return { avg: Math.round(sum / rows.length), count: rows.length };
}

interface Props {
  soldGlobal: TransferPlayerRow[];
  specialtyIds: SpecialtySelection;
}

export function AgeDoubleBarChart({ soldGlobal, specialtyIds }: Props) {
  const data = useMemo(() => {
    const ages = new Set<number>();
    for (const p of soldGlobal) {
      ages.add(p.playerDetails.age);
    }
    const sorted = Array.from(ages).sort((a, b) => a - b);
    return sorted.map((age) => {
      const atAge = soldGlobal.filter((p) => p.playerDetails.age === age);
      const noSpec = atAge.filter((p) => p.playerDetails.specialty === 0);
      const withSpec = atAge.filter((p) => {
        const s = p.playerDetails.specialty;
        if (s === 0) return false;
        if (specialtyIds === "all") return true;
        return specialtyIds.includes(s);
      });
      const a0 = avgPrice(noSpec);
      const a1 = avgPrice(withSpec);
      return {
        age,
        noSpecialty: a0.count > 0 ? a0.avg : null,
        withSpecialty: a1.count > 0 ? a1.avg : null,
        countNo: a0.count,
        countWith: a1.count,
      };
    });
  }, [soldGlobal, specialtyIds]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
        No sold players match the current filters for this chart.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Avg sale price by age (no specialty vs with specialty)
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`
            }
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={48}
          />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const row = payload[0]?.payload as
                | {
                    age: number;
                    noSpecialty: number | null;
                    withSpecialty: number | null;
                    countNo: number;
                    countWith: number;
                  }
                | undefined;
              return (
                <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs shadow">
                  <p className="font-medium text-gray-800 mb-1">Age {label}</p>
                  {payload.map((entry, i) => {
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
                  })}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="noSpecialty" name="No specialty" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={28} />
          <Bar dataKey="withSpecialty" name="With specialty" fill="#f97316" radius={[2, 2, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
