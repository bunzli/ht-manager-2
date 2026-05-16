import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { specialtyLabel } from "../../lib/skills";
import { formatMoney } from "../../lib/format";
import type { TransferPlayerRow } from "../../lib/types";

interface Row {
  specialty: number;
  label: string;
  avgPrice: number;
  count: number;
}

interface Props {
  soldPlayers: TransferPlayerRow[];
}

export function PriceBySpecialtyChart({ soldPlayers }: Props) {
  const data = useMemo(() => {
    const groups = new Map<number, number[]>();
    for (const p of soldPlayers) {
      const spec = p.playerDetails.specialty;
      if (!groups.has(spec)) groups.set(spec, []);
      groups.get(spec)!.push(p.finalPrice!);
    }
    const rows: Row[] = Array.from(groups.entries())
      .map(([specialty, prices]) => ({
        specialty,
        label: specialtyLabel(specialty) || (specialty === 0 ? "None" : `#${specialty}`),
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        count: prices.length,
      }))
      .sort((a, b) => a.specialty - b.specialty);
    return rows;
  }, [soldPlayers]);

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
        Avg sale price by specialty
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`
            }
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={48}
          />
          <Tooltip
            formatter={(value: unknown, _n: unknown, props: { payload?: Row }) => [
              `${formatMoney(Number(value))} (${props.payload?.count ?? 0} sold)`,
              "Avg price",
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Bar dataKey="avgPrice" radius={[3, 3, 0, 0]} maxBarSize={56}>
            {data.map((_, i) => (
              <Cell key={i} fill="#8b5cf6" fillOpacity={0.75 + 0.25 * (i % 2)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
