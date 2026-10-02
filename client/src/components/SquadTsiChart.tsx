import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "../lib/format";
import type { SquadTsiHistoryPoint } from "../lib/types";

const PERIODS = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "1 year", days: 365 },
  { label: "All history", days: null },
] as const;

const dateLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

interface SquadTsiChartProps {
  history: SquadTsiHistoryPoint[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function SquadTsiChart({ history, loading, error, onRetry }: SquadTsiChartProps) {
  const [days, setDays] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const latestAt = history.length ? Date.parse(history[history.length - 1].at) : 0;
  const data = history
    .filter(
      (point) => days === null || Date.parse(point.at) >= latestAt - days * 24 * 60 * 60 * 1000,
    )
    .map((point) => ({ ...point, timestamp: Date.parse(point.at) }));
  const latest = data[data.length - 1];
  const first = data[0];
  const variation = latest && first ? latest.tsi - first.tsi : 0;
  const variationPercent = first?.tsi ? (variation / first.tsi) * 100 : null;

  return (
    <section
      aria-label="Squad TSI history"
      className="min-w-0 rounded-xl border border-[#ddd] bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#444]">Squad TSI history</h3>
          <p className="mt-1 text-xs text-[#777]">
            Total TSI of the squad at each refresh, including arrivals and departures.
          </p>
        </div>
        <div aria-label="History period" className="flex flex-wrap gap-1">
          {PERIODS.map((period) => (
            <button
              key={period.label}
              type="button"
              aria-pressed={days === period.days}
              onClick={() => setDays(period.days)}
              className={`min-h-11 rounded-lg px-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B955F] ${days === period.days ? "bg-[#edf2ed] text-[#426e46]" : "text-[#777] hover:bg-[#f7f9f7]"}`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p role="status" className="grid h-60 place-items-center text-sm text-[#777]">
          Loading TSI history…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="flex h-60 flex-col items-center justify-center gap-3 text-sm text-[#777]"
        >
          <p>Could not load TSI history.</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-lg border border-[#ddd] px-4 font-medium text-[#426e46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B955F]"
          >
            Retry
          </button>
        </div>
      ) : !latest ? (
        <p className="grid h-60 place-items-center text-center text-sm text-[#777]">
          Refresh the squad to start recording its TSI history.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-semibold tabular-nums text-[#444]">
              {formatNumber(latest.tsi)}
            </span>
            {data.length > 1 && (
              <span
                className={`text-xs font-medium tabular-nums ${variation < 0 ? "text-[#b43d3d]" : "text-[#426e46]"}`}
              >
                {variation > 0 ? "+" : ""}
                {formatNumber(variation)}
                {variationPercent !== null &&
                  ` (${variationPercent > 0 ? "+" : ""}${variationPercent.toFixed(1)}%)`}{" "}
                over this period
              </span>
            )}
          </div>
          <div className="mt-4 h-64 min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B955F" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#5B955F" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0ed" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={dateLabel}
                  tick={{ fontSize: 10, fill: "#777" }}
                  minTickGap={28}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, "auto"]}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat(undefined, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                  tick={{ fontSize: 10, fill: "#777" }}
                  width={48}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
                  formatter={(value, _name, item) => [
                    `${formatNumber(Number(value))} · ${item.payload.playerCount} players`,
                    "Total TSI",
                  ]}
                  contentStyle={{ border: "1px solid #ddd", borderRadius: 8, fontSize: 12 }}
                />
                <Area
                  type="linear"
                  dataKey="tsi"
                  name="Total TSI"
                  stroke="#5B955F"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={{ r: 3, fill: "#5B955F", stroke: "#fff", strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {data.length === 1 && (
            <p className="mt-2 text-xs text-[#777]">
              First record saved. Future squad refreshes will show its evolution.
            </p>
          )}
          <details className="mt-3 border-t border-[#eee] pt-3 text-xs text-[#777]">
            <summary className="cursor-pointer rounded-sm font-medium text-[#426e46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B955F]">
              View {data.length} {data.length === 1 ? "record" : "records"}
            </summary>
            <div className="mt-3 max-h-60 overflow-auto">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">Squad TSI history for the selected period</caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-2">
                      Date
                    </th>
                    <th scope="col" className="py-2 text-right">
                      TSI
                    </th>
                    <th scope="col" className="py-2 text-right">
                      Players
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.at} className="border-t border-[#eee]">
                      <td className="py-2 pr-2">{new Date(point.at).toLocaleString()}</td>
                      <td className="py-2 text-right">{formatNumber(point.tsi)}</td>
                      <td className="py-2 text-right">{point.playerCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
