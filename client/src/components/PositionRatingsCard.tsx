import { POSITION_RATINGS, type PositionSkillKey } from "../lib/positionRatings";
import { skillLabel, skillColor } from "../lib/skills";
import type { Player } from "../lib/types";

const WEIGHT_SKILL_LABELS: Record<PositionSkillKey, string> = {
  keeperSkill: "GK",
  defenderSkill: "DF",
  playmakerSkill: "PM",
  wingerSkill: "WG",
  passingSkill: "PA",
  scorerSkill: "SC",
};

interface Props {
  player: Player;
  onOverrideChange?: (positionId: string | null) => void;
  overrideSaving?: boolean;
}

export function PositionRatingsCard({
  player,
  onOverrideChange,
  overrideSaving,
}: Props) {
  const scores = POSITION_RATINGS.map((pos) => ({
    pos,
    score: player.positionScores[pos.id] ?? 0,
  })).sort((a, b) => b.score - a.score);

  // Best by score (ignoring override, used to label the auto-detected position)
  const autoBestId = scores[0]?.pos.id;
  // Effective position used for squad grouping
  const effectiveId = player.positionOverride ?? autoBestId;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Position Ratings
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Weighted average of relevant skills per position (0–20 scale, normal
            orders)
          </p>
        </div>

        {onOverrideChange && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-gray-500 whitespace-nowrap">
              Squad position
            </label>
            <select
              value={player.positionOverride ?? ""}
              disabled={overrideSaving}
              onChange={(e) =>
                onOverrideChange(e.target.value === "" ? null : e.target.value)
              }
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Auto ({scores[0]?.pos.shortLabel})</option>
              {POSITION_RATINGS.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.shortLabel} – {pos.label}
                </option>
              ))}
            </select>
            {player.positionOverride && (
              <button
                disabled={overrideSaving}
                onClick={() => onOverrideChange(null)}
                className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                title="Clear override"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 mt-4">
        {scores.map(({ pos, score }) => {
          const isEffective = pos.id === effectiveId;
          const isOverridden =
            player.positionOverride !== null &&
            player.positionOverride !== undefined;
          const isAutoHighlight = !isOverridden && pos.id === autoBestId;
          const highlight = isEffective && (isOverridden || isAutoHighlight);

          const rounded = Math.round(score * 10) / 10;
          const barWidth = `${(score / 20) * 100}%`;
          const barColor = skillColor(Math.round(score));
          const entries = Object.entries(pos.weights) as [
            PositionSkillKey,
            number,
          ][];
          const totalWeight = entries.reduce((s, [, w]) => s + w, 0);

          return (
            <div
              key={pos.id}
              className={`rounded-lg p-3 border ${
                highlight
                  ? "border-blue-300 bg-blue-50"
                  : "border-transparent bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span
                  className={`text-xs font-bold w-8 shrink-0 ${
                    highlight ? "text-blue-700" : "text-gray-500"
                  }`}
                >
                  {pos.shortLabel}
                </span>
                <span
                  className={`text-sm font-medium flex-1 ${
                    highlight ? "text-blue-800" : "text-gray-700"
                  }`}
                >
                  {pos.label}
                  {highlight && (
                    <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                      {isOverridden ? "Manual" : "Best fit"}
                    </span>
                  )}
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    highlight ? "text-blue-800" : "text-gray-700"
                  }`}
                >
                  {rounded.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 w-24 text-right">
                  {skillLabel(Math.floor(score))}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 shrink-0" />
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: barWidth }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1.5">
                <div className="w-8 shrink-0" />
                <div className="flex gap-2 flex-wrap">
                  {entries
                    .sort(([, a], [, b]) => b - a)
                    .map(([skill, weight]) => {
                      const pct = Math.round((weight / totalWeight) * 100);
                      return (
                        <span
                          key={skill}
                          className="text-xs text-gray-400 tabular-nums"
                        >
                          {WEIGHT_SKILL_LABELS[skill]}{" "}
                          <span className="text-gray-500 font-medium">
                            {pct}%
                          </span>
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
