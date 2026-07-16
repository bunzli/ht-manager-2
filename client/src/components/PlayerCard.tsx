import { specialtyIcon, specialtyLabel, SKILL_KEYS } from "../lib/skills";
import { formatMoney, formatNumber } from "../lib/format";
import { getEffectivePosition } from "../lib/positionRatings";
import { displayName, hattrickPlayerUrl } from "../lib/playerUtils";
import type { Player } from "../lib/types";

interface PlayerCardProps {
  player: Player;
  positionRank: number;
  selected?: boolean;
  onClick?: () => void;
}

const POSITION_STYLES: Record<string, { badge: string; soft: string }> = {
  goalkeeper: { badge: "bg-amber-500 text-amber-950", soft: "bg-amber-50 text-amber-800 ring-amber-200" },
  centralDefender: { badge: "bg-blue-700 text-white", soft: "bg-blue-50 text-blue-800 ring-blue-200" },
  wingBack: { badge: "bg-cyan-600 text-white", soft: "bg-cyan-50 text-cyan-800 ring-cyan-200" },
  innerMidfielder: { badge: "bg-violet-700 text-white", soft: "bg-violet-50 text-violet-800 ring-violet-200" },
  winger: { badge: "bg-teal-600 text-white", soft: "bg-teal-50 text-teal-800 ring-teal-200" },
  forward: { badge: "bg-orange-600 text-white", soft: "bg-orange-50 text-orange-800 ring-orange-200" },
};

const SKILL_STYLES: Record<string, string> = {
  keeperSkill: POSITION_STYLES.goalkeeper.soft,
  defenderSkill: POSITION_STYLES.centralDefender.soft,
  playmakerSkill: POSITION_STYLES.innerMidfielder.soft,
  wingerSkill: POSITION_STYLES.winger.soft,
  scorerSkill: POSITION_STYLES.forward.soft,
  passingSkill: POSITION_STYLES.wingBack.soft,
  setPiecesSkill: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
};

const SKILL_SHORT: Record<string, string> = {
  keeperSkill: "Ke",
  defenderSkill: "De",
  playmakerSkill: "Pl",
  wingerSkill: "Wi",
  scorerSkill: "Sc",
  passingSkill: "Pa",
  setPiecesSkill: "SP",
};

function percent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function signedNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatNumber(Math.abs(value))}`;
}

function topSkills(player: Player) {
  return SKILL_KEYS.filter(
    (skill) => skill.key !== "staminaSkill" && Number(player[skill.key]) > 5,
  )
    .sort((a, b) => Number(player[b.key]) - Number(player[a.key]))
    .slice(0, 4);
}

function ConditionBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[46px_minmax(58px,1fr)_16px] items-center gap-1.5">
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (value / 8) * 100)}%` }} />
      </span>
      <strong className="text-[10px] tabular-nums text-slate-700">{value}</strong>
    </div>
  );
}

export function PlayerCard({ player, positionRank, selected, onClick }: PlayerCardProps) {
  const position = getEffectivePosition(player);
  const positionStyle = POSITION_STYLES[position.pos.id] ?? POSITION_STYLES.innerMidfielder;
  const progress = player.trainingEstimatedWeeks != null
    ? Math.min(100, ((player.trainingUnits ?? 0) / player.trainingEstimatedWeeks) * 100)
    : null;
  const specialty = specialtyLabel(player.specialty);
  const specialtyImage = specialtyIcon(player.specialty);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={selected}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`group grid cursor-pointer grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-4 px-4 py-4 outline-none transition sm:px-5 xl:grid-cols-[86px_minmax(190px,1.2fr)_145px_150px_minmax(205px,1fr)_125px_145px] xl:items-center xl:gap-x-4 xl:py-3.5 ${selected ? "bg-indigo-50 shadow-[inset_3px_0_0_#4f46e5]" : "bg-white hover:bg-blue-50/50 focus-visible:bg-indigo-50/70"}`}
    >
      <div className={`self-stretch rounded-lg px-2 py-2 text-center shadow-sm ${positionStyle.badge}`}>
        <p className="text-sm font-black tracking-wide">{position.pos.shortLabel}</p>
        <p className="mt-0.5 text-[10px] font-semibold opacity-80">#{positionRank} · {position.score.toFixed(1)}</p>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-md bg-slate-900 px-1 text-[10px] font-bold text-white">{player.playerNumber > 0 ? player.playerNumber : "–"}</span>
          <span className="truncate font-semibold text-slate-950">{displayName(player)}</span>
          {specialtyImage && <img src={specialtyImage} alt={`${specialty} specialty`} title={specialty} width={18} height={18} className="shrink-0" />}
          <a href={hattrickPlayerUrl(player.playerId)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${displayName(player)} in Hattrick`} onClick={(event) => event.stopPropagation()} className="shrink-0 rounded px-1 text-xs text-indigo-600 opacity-0 transition focus:opacity-100 group-hover:opacity-100">↗</a>
        </div>
        <p className="mt-1 text-xs text-slate-500">{player.age}y {player.ageDays}d{specialty ? ` · ${specialty}` : ""}</p>
      </div>

      <div className="col-span-2 xl:col-span-1">
        <p className="whitespace-nowrap text-sm font-bold tabular-nums text-slate-950">
          {formatNumber(player.tsi)} <span className={`text-xs ${player.tsiLatestChange != null && player.tsiLatestChange < 0 ? "text-red-600" : "text-green-700"}`}>({signedNumber(player.tsiLatestChange)})</span>
        </p>
        <p className="mt-1 text-[10px] tabular-nums text-slate-500">30d <span className={player.tsiVariationMonthPct != null && player.tsiVariationMonthPct < 0 ? "text-red-600" : "text-green-700"}>{percent(player.tsiVariationMonthPct)}</span> · 90d <span className={player.tsiVariationQuarterPct != null && player.tsiVariationQuarterPct < 0 ? "text-red-600" : "text-green-700"}>{percent(player.tsiVariationQuarterPct)}</span></p>
      </div>

      <div className="col-span-2 space-y-2 xl:col-span-1">
        <ConditionBar label="Stamina" value={player.staminaSkill} color="bg-cyan-500" />
        <ConditionBar label="Form" value={player.playerForm} color="bg-violet-500" />
      </div>

      <div className="col-span-2 grid grid-cols-4 gap-1.5 xl:col-span-1">
        {topSkills(player).map((skill) => (
          <span key={skill.key} title={skill.label} className={`flex min-w-0 flex-col items-center rounded-md px-1.5 py-1.5 text-center ring-1 ${SKILL_STYLES[skill.key] ?? "bg-slate-50 text-slate-700 ring-slate-200"}`}>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{SKILL_SHORT[skill.key] ?? skill.label.slice(0, 2)}</span>
            <strong className="mt-0.5 text-sm leading-none tabular-nums">{player[skill.key]}</strong>
          </span>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold tabular-nums text-slate-900">{player.estimatedValue == null ? "Unavailable" : formatMoney(player.estimatedValue)}</p>
        <p className="mt-1 text-[10px] text-slate-400">Estimated value</p>
      </div>

      <div>
        <p className="text-xs font-semibold tabular-nums text-slate-700">{player.trainingEstimatedWeeks == null ? "Not configured" : `${(player.trainingUnits ?? 0).toFixed(1)} / ${player.trainingEstimatedWeeks.toFixed(1)}w`}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={progress != null && progress >= 100 ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-indigo-600"} style={{ width: `${progress ?? 0}%` }} /></div>
        <p className="mt-1 text-[10px] text-slate-400">{progress == null ? "Training progress" : `${progress.toFixed(0)}% estimated`}</p>
      </div>
    </div>
  );
}
