import { formatMoney } from "../../lib/format";
import type { TransferPlayerRow } from "../../lib/types";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

export interface StudyMetricsData {
  total: number;
  soldCount: number;
  listedCount: number;
  endedCount: number;
  notSoldCount: number;
  avgAsking: number;
  avgFinal: number | null;
}

export function computeMetrics(filtered: TransferPlayerRow[]): StudyMetricsData {
  const total = filtered.length;
  const sold = filtered.filter((p) => p.status === "sold");
  const listed = filtered.filter((p) => p.status === "listed");
  const ended = filtered.filter((p) => p.status === "ended");
  const notSold = filtered.filter(
    (p) => p.status === "not_sold" || p.status === "expired",
  );

  const avgAsking =
    total > 0
      ? Math.round(filtered.reduce((s, p) => s + p.askingPrice, 0) / total)
      : 0;
  const avgFinal =
    sold.length > 0
      ? Math.round(
          sold.reduce((s, p) => s + (p.finalPrice ?? 0), 0) / sold.length,
        )
      : null;

  return {
    total,
    soldCount: sold.length,
    listedCount: listed.length,
    endedCount: ended.length,
    notSoldCount: notSold.length,
    avgAsking,
    avgFinal,
  };
}

interface StudyMetricsProps {
  metrics: StudyMetricsData;
}

export function StudyMetrics({ metrics }: StudyMetricsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard label="Total" value={metrics.total} />
      <MetricCard label="Listed" value={metrics.listedCount} />
      <MetricCard label="Sold" value={metrics.soldCount} />
      <MetricCard label="Ended" value={metrics.endedCount} />
      <MetricCard label="Not Sold" value={metrics.notSoldCount} />
      <MetricCard label="Avg Asking" value={formatMoney(metrics.avgAsking)} />
      <MetricCard
        label="Avg Sale"
        value={
          metrics.avgFinal !== null ? formatMoney(metrics.avgFinal) : "—"
        }
      />
    </div>
  );
}
