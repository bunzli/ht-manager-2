import { useCallback, useRef } from "react";

interface Props {
  label: string;
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (range: [number, number]) => void;
  format?: (n: number) => string;
  disabled?: boolean;
}

export function RangeSlider({
  label,
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  format = (n) => String(n),
  disabled,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const range = safeMax - safeMin || 1;
  const lo = Math.max(safeMin, Math.min(valueMin, valueMax));
  const hi = Math.min(safeMax, Math.max(valueMin, valueMax));

  const loPercent = ((lo - safeMin) / range) * 100;
  const hiPercent = ((hi - safeMin) / range) * 100;

  const getValueFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return safeMin;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = safeMin + ratio * range;
      return Math.round(raw);
    },
    [safeMin, range],
  );

  const startDragLo = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const v = Math.max(safeMin, Math.min(getValueFromEvent(ev.clientX), hi));
        onChange([v, hi]);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [disabled, safeMin, hi, getValueFromEvent, onChange],
  );

  const startDragHi = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const v = Math.min(safeMax, Math.max(getValueFromEvent(ev.clientX), lo));
        onChange([lo, v]);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [disabled, safeMax, lo, getValueFromEvent, onChange],
  );

  if (safeMin === safeMax) {
    return (
      <div className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="ml-2">{format(safeMin)}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="tabular-nums text-gray-500">
          {format(lo)} – {format(hi)}
        </span>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-5 flex items-center select-none">
        {/* Rail */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        {/* Active fill */}
        <div
          className="absolute h-1.5 rounded-full bg-blue-500"
          style={{ left: `${loPercent}%`, right: `${100 - hiPercent}%` }}
        />
        {/* Lo thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow cursor-grab active:cursor-grabbing -translate-x-1/2 hover:scale-110 transition-transform"
          style={{ left: `${loPercent}%` }}
          onPointerDown={startDragLo}
          role="slider"
          aria-label={`${label} minimum`}
          aria-valuenow={lo}
          aria-valuemin={safeMin}
          aria-valuemax={hi}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown")
              onChange([Math.max(safeMin, lo - 1), hi]);
            if (e.key === "ArrowRight" || e.key === "ArrowUp")
              onChange([Math.min(hi, lo + 1), hi]);
          }}
        />
        {/* Hi thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow cursor-grab active:cursor-grabbing -translate-x-1/2 hover:scale-110 transition-transform"
          style={{ left: `${hiPercent}%` }}
          onPointerDown={startDragHi}
          role="slider"
          aria-label={`${label} maximum`}
          aria-valuenow={hi}
          aria-valuemin={lo}
          aria-valuemax={safeMax}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown")
              onChange([lo, Math.max(lo, hi - 1)]);
            if (e.key === "ArrowRight" || e.key === "ArrowUp")
              onChange([lo, Math.min(safeMax, hi + 1)]);
          }}
        />
      </div>
    </div>
  );
}
