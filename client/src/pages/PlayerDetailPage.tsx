import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlayer, setPositionOverride } from "../lib/api";
import { PlayerAvatarFromJson } from "../components/PlayerAvatar";
import { SkillBar } from "../components/SkillBar";
import { PositionRatingsCard } from "../components/PositionRatingsCard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { BackLink } from "../components/ui/BackLink";
import {
  skillLabel,
  specialtyLabel,
  specialtyIcon,
  SKILL_KEYS,
} from "../lib/skills";
import { formatNumber, formatMoney } from "../lib/format";
import { displayName } from "../lib/playerUtils";
import { usePlayerPrediction } from "../hooks/usePriceModel";
import type { Player, PlayerChange } from "../lib/types";

interface Props {
  playerId: number;
  onBack: () => void;
}

function InjuryBadge({ level }: { level: number }) {
  if (level === -1) return null;
  const label = level === 0 ? "Bruised" : `Injured (${level}w)`;
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
      🩹 {label}
    </span>
  );
}

function CardsBadge({ cards }: { cards: number }) {
  if (cards === 0) return null;
  if (cards === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
        <span className="inline-block w-2.5 h-3.5 rounded-[2px] bg-red-600" />
        Red card
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
      {Array.from({ length: cards }).map((_, i) => (
        <span key={i} className="inline-block w-2.5 h-3.5 rounded-[2px] bg-yellow-400" />
      ))}
      {cards === 1 ? "1 yellow card" : `${cards} yellow cards`}
    </span>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

const CHANGE_LABELS: Record<string, string> = {
  staminaSkill: "Stamina",
  keeperSkill: "Keeper",
  playmakerSkill: "Playmaking",
  scorerSkill: "Scoring",
  passingSkill: "Passing",
  wingerSkill: "Winger",
  defenderSkill: "Defending",
  setPiecesSkill: "Set Pieces",
  playerForm: "Form",
  experience: "Experience",
  loyalty: "Loyalty",
  leadership: "Leadership",
  tsi: "TSI",
  salary: "Salary",
  injuryLevel: "Injury",
  cards: "Cards",
};

const SKILL_CHANGE_KEYS = new Set([
  "staminaSkill",
  "keeperSkill",
  "playmakerSkill",
  "scorerSkill",
  "passingSkill",
  "wingerSkill",
  "defenderSkill",
  "setPiecesSkill",
  "playerForm",
  "experience",
  "loyalty",
  "leadership",
]);

function formatChangeValue(key: string, value: string) {
  if (SKILL_CHANGE_KEYS.has(key)) return skillLabel(Number(value));
  if (key === "tsi") return formatNumber(Number(value));
  if (key === "salary") return formatMoney(Number(value));
  return value;
}

function groupChangesByDate(changes: PlayerChange[]) {
  const groups = new Map<string, PlayerChange[]>();
  for (const c of changes) {
    const day = new Date(c.detectedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(c);
  }
  return [...groups.entries()];
}

export function PlayerDetailPage({ playerId, onBack }: Props) {
  const queryClient = useQueryClient();
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["player", playerId],
    queryFn: () => fetchPlayer(playerId),
  });

  const { predictedPrice } = usePlayerPrediction(playerId);

  const player = data?.player ?? null;
  const allChanges = data?.allChanges ?? [];

  const handlePositionOverride = async (positionId: string | null) => {
    if (!player) return;
    setOverrideSaving(true);
    setOverrideError(null);
    try {
      await setPositionOverride(player.playerId, positionId);
      queryClient.setQueryData(["player", playerId], {
        ...data,
        player: { ...player, positionOverride: positionId },
      });
    } catch (err) {
      setOverrideError(
        err instanceof Error ? err.message : "Failed to update position",
      );
    } finally {
      setOverrideSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading player..." />;
  }

  const displayError =
    overrideError ?? (error instanceof Error ? error.message : null);

  if ((displayError && !player) || !player) {
    return (
      <div>
        <BackLink onClick={onBack} label="Back to squad" />
        <div className="mt-4">
          <ErrorAlert message={displayError ?? "Player not found"} />
        </div>
      </div>
    );
  }

  const name = displayName(player);
  const specialty = specialtyLabel(player.specialty);
  const specIcon = specialtyIcon(player.specialty);
  const changeMap = new Map<string, PlayerChange>();
  for (const c of player.recentChanges) {
    if (!changeMap.has(c.key)) changeMap.set(c.key, c);
  }
  const groupedHistory = groupChangesByDate(allChanges);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackLink onClick={onBack} label="Back to squad" />

      {overrideError && (
        <ErrorAlert message={overrideError} />
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-6">
          <div className="shrink-0">
            <PlayerAvatarFromJson
              avatarBackground={player.avatarBackground}
              avatarLayers={player.avatarLayers}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{player.age}y {player.ageDays}d</span>
                  {specialty && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1">
                        {specIcon && (
                          <img src={specIcon} alt={specialty} width={16} height={16} />
                        )}
                        {specialty}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {player.playerNumber > 0 && (
                <span className="text-3xl font-bold text-gray-300">
                  #{player.playerNumber}
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {player.transferListed && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Transfer listed
                </span>
              )}
              {player.motherClubBonus && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Mother club
                </span>
              )}
              <InjuryBadge level={player.injuryLevel} />
              <CardsBadge cards={player.cards} />
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
              <StatItem label="TSI" value={formatNumber(player.tsi)} />
              <StatItem label="Salary" value={formatMoney(player.salary)} />
              <StatItem label="Form" value={skillLabel(player.playerForm)} />
              <StatItem label="Experience" value={skillLabel(player.experience)} />
              <StatItem label="Stamina" value={skillLabel(player.staminaSkill)} />
              <StatItem label="Leadership" value={skillLabel(player.leadership)} />
              <StatItem label="Loyalty" value={skillLabel(player.loyalty)} />
              {player.isAbroad && <StatItem label="Abroad" value="Yes" />}
              {predictedPrice !== null && (
                <StatItem label="Est. Price" value={formatMoney(predictedPrice)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Skills
        </h3>
        <div className="space-y-2">
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

      {/* Position Ratings */}
      <PositionRatingsCard
        player={player}
        onOverrideChange={handlePositionOverride}
        overrideSaving={overrideSaving}
      />

      {/* Change history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Change History
        </h3>
        {groupedHistory.length === 0 ? (
          <p className="text-gray-400 text-sm">No changes recorded yet.</p>
        ) : (
          <div className="space-y-5">
            {groupedHistory.map(([date, changes]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {date}
                </p>
                <div className="space-y-1.5">
                  {changes.map((c) => {
                    const isUp = Number(c.newValue) > Number(c.oldValue);
                    const isStat = SKILL_CHANGE_KEYS.has(c.key);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="font-medium text-gray-700 w-28 shrink-0">
                          {CHANGE_LABELS[c.key] ?? c.key}
                        </span>
                        <span className="text-gray-400">
                          {formatChangeValue(c.key, c.oldValue)}
                        </span>
                        <span className="text-gray-300">→</span>
                        <span
                          className={
                            isStat
                              ? isUp
                                ? "text-green-600 font-semibold"
                                : "text-red-500 font-semibold"
                              : "text-gray-700 font-medium"
                          }
                        >
                          {formatChangeValue(c.key, c.newValue)}
                        </span>
                        {isStat && (
                          <span
                            className={`ml-auto text-xs font-bold ${
                              isUp ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {isUp ? "+" : ""}
                            {Number(c.newValue) - Number(c.oldValue)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
