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
import type { PriceByAge, PriceBySpecialty } from "../../lib/types";

interface Props {
  priceByAge: PriceByAge[];
  priceBySpecialty: PriceBySpecialty[];
}

export function StudyCharts({ priceByAge, priceBySpecialty }: Props) {
  if (priceByAge.length === 0 && priceBySpecialty.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {priceByAge.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Avg Sale Price by Age
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={priceByAge}
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Age",
                  position: "insideBottom",
                  offset: -2,
                  fontSize: 11,
                  fill: "#9ca3af",
                }}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  `$${((v * 20) / 1_000_000).toFixed(1)}M`
                }
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(
                  value: unknown,
                  _name: unknown,
                  props: { payload?: PriceByAge },
                ) => [
                  `${formatMoney(Number(value))} (${props.payload?.count ?? 0} sold)`,
                  "Avg price",
                ]}
                labelFormatter={(label: unknown) => `Age ${label}`}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="avgPrice" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {priceByAge.map((_, i) => (
                  <Cell
                    key={i}
                    fill="#3b82f6"
                    fillOpacity={0.75 + 0.25 * (i % 2)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {priceBySpecialty.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Avg Sale Price by Specialty
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={priceBySpecialty}
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="specialty"
                tickFormatter={(v: number) =>
                  specialtyLabel(v) || `#${v}`
                }
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  `$${((v * 20) / 1_000_000).toFixed(1)}M`
                }
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(
                  value: unknown,
                  _name: unknown,
                  props: { payload?: PriceBySpecialty },
                ) => [
                  `${formatMoney(Number(value))} (${props.payload?.count ?? 0} sold)`,
                  "Avg price",
                ]}
                labelFormatter={(label: unknown) =>
                  specialtyLabel(Number(label)) || `Specialty ${label}`
                }
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="avgPrice" radius={[3, 3, 0, 0]} maxBarSize={60}>
                {priceBySpecialty.map((_, i) => (
                  <Cell
                    key={i}
                    fill="#8b5cf6"
                    fillOpacity={0.75 + 0.25 * (i % 2)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
