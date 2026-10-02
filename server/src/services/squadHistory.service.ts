import type { PrismaClient } from "@prisma/client";

export async function getSquadTsiHistory(prisma: PrismaClient) {
  // Keep former squad members in their historical totals.
  const trackings = await prisma.playerTracking.findMany({ select: { playerId: true } });
  if (!trackings.length) return [];

  // A squad refresh gives every player the same fetchedAt. Market-study
  // snapshots have their own transfer record and must not affect these totals.
  const snapshots = await prisma.playerDetails.groupBy({
    by: ["fetchedAt"],
    where: {
      playerId: { in: trackings.map((player) => player.playerId) },
      transferPlayers: { none: {} },
    },
    _sum: { tsi: true },
    _count: { playerId: true },
    orderBy: { fetchedAt: "asc" },
  });
  return snapshots.map((snapshot) => ({
    at: snapshot.fetchedAt.toISOString(),
    tsi: snapshot._sum.tsi ?? 0,
    playerCount: snapshot._count.playerId,
  }));
}
