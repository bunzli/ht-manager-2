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
  type BarRectangleItem,
} from "recharts";
import { formatMoney } from "../../lib/format";
import { aggregateCustomChart } from "../../lib/chartAggregator";
import { SKILL_TYPE_MAP } from "../../lib/skillTypes";
import type {
  CustomChartConfig,
  TransferPlayerRow,
  ChartBucket,
} from "../../lib/types";

const DIMENSION_LABELS: Record<string, string> = {
  age: "Age",
  specialty: "Specialty",
  ...Object.fromEntries(SKILL_TYPE_MAP.map((s) => [s.field, s.label])),
};

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
];

function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function buildTitle(config: CustomChartConfig): string {
  const groupLabel = DIMENSION_LABELS[config.groupBy] ?? config.groupBy;
  let title = `Avg Price by ${groupLabel}`;
  if (config.filters.length > 0) {
    const parts = config.filters.map((f) => {
      const fLabel = DIMENSION_LABELS[f.field] ?? f.field;
      if (f.field === "age") return `${fLabel} ${f.value}–${f.value + 1}`;
      const isSkill = SKILL_TYPE_MAP.some((s) => s.field === f.field);
      return `${fLabel} ${isSkill ? ">=" : "="} ${f.value}`;
    });
    title += `, ${parts.join(", ")}`;
  }
  return title;
}

interface Props {
  config: CustomChartConfig;
  players: TransferPlayerRow[];
  colorIndex: number;
  onRemove: (chartId: number) => void;
  onBarClick?: (config: CustomChartConfig, bucketKey: number) => void;
  removing?: boolean;
}

export function CustomChart({
  config,
  players,
  colorIndex,
  onRemove,
  onBarClick,
  removing,
}: Props) {
  const buckets = useMemo(
    () => aggregateCustomChart(players, config),
    [players, config],
  );

  const title = buildTitle(config);
  const color = chartColor(colorIndex);

  if (buckets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <button
            onClick={() => onRemove(config.id)}
            disabled={removing}
            className="text-gray-400 hover:text-red-500 text-sm disabled:opacity-50"
          >
            x
          </button>
        </div>
        <p className="text-sm text-gray-400 text-center py-8">
          No sold data matches these filters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <button
          onClick={() => onRemove(config.id)}
          disabled={removing}
          className="text-gray-400 hover:text-red-500 text-sm disabled:opacity-50"
        >
          x
        </button>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={buckets}
          margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="label"
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
              props: { payload?: ChartBucket },
            ) => [
              `${formatMoney(Number(value))} (${props.payload?.count ?? 0} sold)`,
              "Avg price",
            ]}
            labelFormatter={(label: unknown) => String(label)}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Bar
            dataKey="avgPrice"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={
              onBarClick
                ? (data: BarRectangleItem) =>
                    onBarClick(config, (data.payload as ChartBucket).key)
                : undefined
            }
          >
            {buckets.map((_, i) => (
              <Cell
                key={i}
                fill={color}
                fillOpacity={0.75 + 0.25 * (i % 2)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
