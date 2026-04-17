import { SkillBar } from "./SkillBar";
import { specialtyLabel, SKILL_KEYS } from "../lib/skills";
import { formatNumber, formatMoney } from "../lib/format";
import type { TransferSearchResult } from "../lib/types";

interface TransferResultCardProps {
  result: TransferSearchResult;
}

export function TransferResultCard({ result }: TransferResultCardProps) {
  const displayName = result.NickName
    ? `${result.FirstName} "${result.NickName}" ${result.LastName}`
    : `${result.FirstName} ${result.LastName}`;

  const d = result.Details;
  const specialty = d ? specialtyLabel(d.Specialty) : "";
  const deadline = new Date(result.Deadline);
  const isExpiringSoon =
    deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const skillMap: Record<string, number | undefined> = {
    staminaSkill: d?.StaminaSkill,
    keeperSkill: d?.KeeperSkill,
    playmakerSkill: d?.PlaymakerSkill,
    scorerSkill: d?.ScorerSkill,
    passingSkill: d?.PassingSkill,
    wingerSkill: d?.WingerSkill,
    defenderSkill: d?.DefenderSkill,
    setPiecesSkill: d?.SetPiecesSkill,
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{displayName}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
            {d && (
              <>
                <span>
                  {d.Age}y {d.AgeDays}d
                </span>
                <span className="text-gray-300">|</span>
                <span>TSI {formatNumber(d.TSI)}</span>
                <span className="text-gray-300">|</span>
                <span>Salary {formatMoney(d.Salary)}</span>
              </>
            )}
            {specialty && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-indigo-600 font-medium">{specialty}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-sm font-semibold text-gray-900">
            {formatMoney(result.AskingPrice)}
          </p>
          {result.HighestBid > 0 && (
            <p className="text-xs text-orange-600 font-medium">
              Bid: {formatMoney(result.HighestBid)}
            </p>
          )}
          <p
            className={`text-xs mt-0.5 ${
              isExpiringSoon ? "text-red-600 font-medium" : "text-gray-400"
            }`}
          >
            {deadline.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Seller: {result.SellerTeam.TeamName}
        {result.BidderTeam && (
          <span className="ml-2 text-orange-500">
            · Leading bid by {result.BidderTeam.TeamName}
          </span>
        )}
      </p>

      {d && (
        <div className="space-y-1">
          {SKILL_KEYS.map(({ key, label }) => {
            const level = skillMap[key];
            if (level === undefined) return null;
            return <SkillBar key={key} label={label} level={level} />;
          })}
        </div>
      )}
    </div>
  );
}
