import { SkillBar } from "./SkillBar";
import { PlayerAvatarFromJson } from "./PlayerAvatar";
import { specialtyLabel, specialtyIcon, skillColor, skillLabel, SKILL_KEYS } from "../lib/skills";
import { formatNumber, formatMoney } from "../lib/format";
import { POSITION_RATINGS } from "../lib/positionRatings";
import { displayName, hattrickPlayerUrl } from "../lib/playerUtils";
import type { Player, PlayerChange } from "../lib/types";

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
}

function InjuryIcon({ level }: { level: number }) {
  if (level === -1) return null;
  const label = level === 0 ? "Bruised" : `Injured (${level}w)`;
  return (
    <span title={label} className="text-base leading-none" aria-label={label}>
      🩹
    </span>
  );
}

function CardsIcon({ cards }: { cards: number }) {
  if (cards === 0) return null;
  if (cards === 3) {
    return (
      <span
        title="Red card"
        aria-label="Red card"
        className="inline-block w-2.5 h-3.5 rounded-[2px] bg-red-600 shrink-0"
      />
    );
  }
  return (
    <span className="inline-flex gap-0.5" title={`${cards} yellow card${cards > 1 ? "s" : ""}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-2.5 h-3.5 rounded-[2px] bg-yellow-400 shrink-0"
        />
      ))}
    </span>
  );
}

export function PlayerCard({ player, onClick }: PlayerCardProps) {
  const specialty = specialtyLabel(player.specialty);
  const specIcon = specialtyIcon(player.specialty);
  const hasChanges = player.recentChanges.length > 0;
  const changeMap = new Map<string, PlayerChange>();
  for (const c of player.recentChanges) {
    if (!changeMap.has(c.key)) {
      changeMap.set(c.key, c);
    }
  }

  const ageStr = `${player.age}y ${player.ageDays}d`;
  const name = displayName(player);

  const bestPosition = POSITION_RATINGS.reduce(
    (best, pos) => {
      const score = player.positionScores[pos.id] ?? 0;
      return score > best.score ? { pos, score } : best;
    },
    { pos: POSITION_RATINGS[0], score: player.positionScores[POSITION_RATINGS[0].id] ?? 0 },
  );

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border p-4 ${
        hasChanges ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"
      } ${onClick ? "cursor-pointer hover:shadow-md hover:border-blue-400 transition-shadow" : ""}`}
    >
      <div className="flex gap-4">
        {/* Left column: avatar + player metadata */}
        <div className="shrink-0 flex flex-col gap-2" style={{ width: 110 }}>
          <PlayerAvatarFromJson
            avatarBackground={player.avatarBackground}
            avatarLayers={player.avatarLayers}
          />
          <div className="text-xs text-gray-500 space-y-1 w-full">
            {[
              { label: "Form", value: player.playerForm, max: 8 },
              { label: "Stamina", value: player.staminaSkill, max: 8 },
            ].map(({ label, value, max }) => {
              const pct = Math.min((value / max) * 100, 100);
              const color = skillColor(value, max);
              const levelLabel = skillLabel(value);
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-gray-400 shrink-0 w-11">{label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] text-gray-500 pointer-events-none select-none whitespace-nowrap">
                      {levelLabel}
                    </span>
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full overflow-hidden ${color}`}
                      style={{ width: `${pct}%` }}
                    >
                      <span
                        className="absolute top-0 left-0 h-full flex items-center px-2 text-[10px] text-white pointer-events-none select-none whitespace-nowrap"
                        style={{ width: pct > 0 ? `${(100 / pct) * 100}%` : "0" }}
                      >
                        {levelLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-gray-100 pt-1 mt-1 flex justify-between gap-1">
              <span className="text-gray-400 shrink-0">Wage</span>
              <span className="text-right">{formatMoney(player.salary)}</span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-gray-400 shrink-0">Exp</span>
              <span className="text-right">{skillLabel(player.experience)}</span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-gray-400 shrink-0">Leader</span>
              <span className="text-right">{skillLabel(player.leadership)}</span>
            </div>
            <div className="flex justify-between gap-1">
              <span className="text-gray-400 shrink-0">Loyalty</span>
              <span className="text-right">{skillLabel(player.loyalty)}</span>
            </div>
          </div>
        </div>

        {/* Right column: name, form, badges, skills */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <a
                href={hattrickPlayerUrl(player.playerId)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-gray-900 truncate hover:text-blue-600 hover:underline"
              >
                {name}
              </a>
              {specIcon && (
                <img
                  src={specIcon}
                  alt={specialty}
                  title={specialty}
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              )}
              <CardsIcon cards={player.cards} />
              <InjuryIcon level={player.injuryLevel} />
            </div>
            {player.playerNumber > 0 && (
              <span className="text-lg font-bold text-gray-400 shrink-0">
                #{player.playerNumber}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs text-gray-500">
            <span>{ageStr}</span>
            <span className="text-gray-300">|</span>
            <span>TSI {formatNumber(player.tsi)}</span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-gray-600">
              {bestPosition.pos.shortLabel}:{" "}
              <span className="text-gray-800">
                {(Math.round(bestPosition.score * 10) / 10).toFixed(1)}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {player.transferListed && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                Transfer listed
              </span>
            )}
            {hasChanges && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Changed
              </span>
            )}
          </div>

          <div className="space-y-1 mt-auto">
            {SKILL_KEYS.filter(({ key }) => key !== "staminaSkill").map(({ key, label }) => (
              <SkillBar
                key={key}
                label={label}
                level={player[key as keyof Player] as number}
                change={changeMap.get(key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
