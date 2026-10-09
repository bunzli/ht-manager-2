import { specialtyIcon, specialtyLabel } from "../lib/skills";
import { getEffectivePosition } from "../lib/positionRatings";
import { displayName, hattrickPlayerUrl } from "../lib/playerUtils";
import type { Player } from "../lib/types";
import { SkillBar } from "./SkillBar";
import { PlayerTsi } from "./PlayerTsi";
import { PlayerAvatar } from "./PlayerAvatar";
import { hattrickImageUrl } from "../lib/hattrickImages";

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
}

export const CARD_SKILLS = [
  { key: "keeperSkill", label: "Keeper" },
  { key: "defenderSkill", label: "Defending" },
  { key: "playmakerSkill", label: "Playmaking" },
  { key: "wingerSkill", label: "Winger" },
  { key: "passingSkill", label: "Passing" },
  { key: "scorerSkill", label: "Scoring" },
  { key: "setPiecesSkill", label: "Set Pieces" },
] as const;

export function PlayerCard({ player, selected, onClick }: PlayerCardProps) {
  const position = getEffectivePosition(player);
  const name = displayName(player);
  const specialtyImage = specialtyIcon(player.specialty);
  const changes = player.trainingChanges;
  return (
    <article
      aria-label={name}
      className={`flex min-w-0 flex-col rounded-xl border bg-white p-3 shadow-[0_2px_4px_#0000000a] sm:p-4 ${selected ? "border-[#5B955F] ring-1 ring-[#5B955F]" : "border-[#ddd]"}`}
    >
      <div className="flex items-start gap-2.5">
        <PlayerAvatar player={player} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start gap-1.5 break-words text-[16px] font-medium leading-snug text-[#444]">
            <a
              href={hattrickPlayerUrl(player.playerId)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${name} in Hattrick`}
              className="min-w-0 rounded-sm hover:text-[#426e46] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B955F]"
            >
              {player.playerNumber > 0 ? `${player.playerNumber}. ` : ""}
              {name}
            </a>
            {specialtyImage && (
              <img
                src={specialtyImage}
                alt={`${specialtyLabel(player.specialty)} specialty`}
                title={specialtyLabel(player.specialty)}
                width={18}
                height={18}
                className="mt-0.5 shrink-0"
              />
            )}
          </h3>
          <PlayerTsi player={player} />
          <p className="mt-1 text-xs text-[#777]">
            {player.age}y {player.ageDays}d
          </p>
        </div>
        <div className="mt-1 flex shrink-0 flex-col items-center gap-2">
          {!!player.countryFlagId && (
            <img
              src={hattrickImageUrl(`/Img/Flags/${player.countryFlagId}.png`)}
              alt={`${player.countryName ?? "Nationality"} flag`}
              title={player.countryName ?? "Nationality"}
              width={20}
              height={12}
              className="shrink-0"
            />
          )}
          <span
            title={position.pos.label}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#999] text-xs font-semibold text-white"
          >
            {position.pos.shortLabel}
          </span>
        </div>
      </div>
      <div className="mb-5 mt-5 space-y-2 pr-8">
        <SkillBar
          label="Form"
          level={player.playerForm}
          maxLevel={8}
          change={changes?.playerForm}
          variant="hattrick"
        />
        <SkillBar
          label="Stamina"
          level={player.staminaSkill}
          maxLevel={8}
          change={changes?.staminaSkill}
          variant="hattrick"
        />
      </div>
      <div className="space-y-2">
        {CARD_SKILLS.map(({ key, label }) => (
          <SkillBar
            key={key}
            label={label}
            level={player[key]}
            change={changes?.[key]}
            variant="hattrick"
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={!!selected}
        aria-controls={selected ? `player-detail-${player.playerId}` : undefined}
        aria-label={`${selected ? "Close" : "View"} details for ${name}`}
        className="mt-4 min-h-11 w-full rounded-lg border border-[#e3e6e3] bg-[#f7f9f7] px-3 text-xs font-semibold text-[#426e46] transition hover:bg-[#edf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B955F]"
      >
        {selected ? "Close details ↑" : "View details ↓"}
      </button>
    </article>
  );
}
