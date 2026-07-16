import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import type { ChppLineupPlayer } from "../chpp/types";

export function selectPlayerAppearances(
  players: ChppLineupPlayer[],
): ChppLineupPlayer[] {
  const appearances = new Map<number, ChppLineupPlayer>();

  for (const player of players) {
    const played =
      (player.PositionCode != null && player.PositionCode > 0) ||
      (player.RatingStars != null && player.RatingStars > 0);
    if (player.PlayerID <= 0 || !played) continue;

    const current = appearances.get(player.PlayerID);
    const currentScore =
      (current?.PositionCode != null ? 2 : 0) +
      (current?.RatingStars != null ? 1 : 0);
    const nextScore =
      (player.PositionCode != null ? 2 : 0) +
      (player.RatingStars != null ? 1 : 0);
    if (!current || nextScore > currentScore) {
      appearances.set(player.PlayerID, player);
    }
  }

  return [...appearances.values()];
}

export async function syncRecentMatches(
  prisma: PrismaClient,
  chpp: ChppClient,
  teamId: number | string,
) {
  const archive = await chpp.getMatchesArchive(teamId);
  let lineupsStored = 0;
  let lineupsRequested = 0;
  let failures = 0;

  for (const match of archive.Matches) {
    const matchDate = new Date(match.MatchDate);
    if (match.MatchID <= 0 || Number.isNaN(matchDate.getTime())) continue;

    const storedMatch = await prisma.teamMatch.upsert({
      where: { matchId: match.MatchID },
      update: {
        matchDate,
        matchType: match.MatchType,
        homeTeamId: match.HomeTeamID,
        homeTeamName: match.HomeTeamName,
        awayTeamId: match.AwayTeamID,
        awayTeamName: match.AwayTeamName,
        homeGoals: match.HomeGoals,
        awayGoals: match.AwayGoals,
      },
      create: {
        matchId: match.MatchID,
        matchDate,
        matchType: match.MatchType,
        homeTeamId: match.HomeTeamID,
        homeTeamName: match.HomeTeamName,
        awayTeamId: match.AwayTeamID,
        awayTeamName: match.AwayTeamName,
        homeGoals: match.HomeGoals,
        awayGoals: match.AwayGoals,
      },
    });

    if (storedMatch.lineupFetchedAt) continue;

    lineupsRequested += 1;
    try {
      const lineup = await chpp.getMatchLineup(match.MatchID, teamId);
      const appearances = selectPlayerAppearances(lineup.Players);
      if (appearances.length === 0) {
        throw new Error("CHPP returned no player appearances");
      }

      await prisma.$transaction([
        ...appearances.map((player) =>
          prisma.playerMatchAppearance.upsert({
            where: {
              playerId_teamMatchId: {
                playerId: player.PlayerID,
                teamMatchId: storedMatch.id,
              },
            },
            update: {
              roleId: player.RoleID,
              positionCode: player.PositionCode,
              behaviour: player.Behaviour,
              ratingStars: player.RatingStars,
            },
            create: {
              teamMatchId: storedMatch.id,
              playerId: player.PlayerID,
              roleId: player.RoleID,
              positionCode: player.PositionCode,
              behaviour: player.Behaviour,
              ratingStars: player.RatingStars,
            },
          }),
        ),
        prisma.teamMatch.update({
          where: { id: storedMatch.id },
          data: { lineupFetchedAt: new Date() },
        }),
      ]);
      lineupsStored += 1;
    } catch (error) {
      failures += 1;
      console.warn(
        `[matches] Failed to sync lineup for match ${match.MatchID}:`,
        error,
      );
    }
  }

  console.log(
    `[matches] Archive=${archive.Matches.length}, new lineups=${lineupsStored}, failures=${failures}`,
  );
  if (lineupsRequested > 0 && failures === lineupsRequested) {
    throw new Error(`Unable to import any of ${lineupsRequested} match lineups`);
  }
  return { matchesFound: archive.Matches.length, lineupsStored, failures };
}
