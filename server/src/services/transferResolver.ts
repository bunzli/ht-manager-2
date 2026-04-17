import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import { PlayerTransfer } from "../chpp/types";
import { stockholmToUtcIso } from "../chpp/parsers";
import { TRANSFER_STATUS } from "../lib/constants";

export function normalizeDeadline(deadline: string): string {
  if (!deadline) return deadline;
  if (deadline.includes("T") && deadline.endsWith("Z")) return deadline;
  return stockholmToUtcIso(deadline);
}

const MATCH_WINDOW_MS = 60 * 60 * 1000; // ±1 hour

/**
 * Match a stored auction deadline to an entry in the player's transfer history.
 *
 * CHPP `transfersplayer` and `transfersearch` may produce slightly different
 * UTC millisecond values for the same logical deadline. We accept a ±60-minute
 * window. When multiple candidates match, we prefer a seller-team match, then
 * the closest deadline.
 */
export function findMatchingTransfer(
  transfers: PlayerTransfer[],
  storedDeadlineUtc: string,
  sellerTeamId?: number | null,
): PlayerTransfer | undefined {
  if (!storedDeadlineUtc) return undefined;
  const storedMs = new Date(storedDeadlineUtc).getTime();
  if (isNaN(storedMs)) return undefined;

  const candidates = transfers.filter((t) => {
    if (!t.Deadline) return false;
    const apiMs = new Date(t.Deadline).getTime();
    return !isNaN(apiMs) && Math.abs(apiMs - storedMs) <= MATCH_WINDOW_MS;
  });

  if (candidates.length === 0) return undefined;

  if (sellerTeamId != null && candidates.length > 1) {
    const sellerMatch = candidates.find(
      (t) => t.Seller.SellerTeamID === sellerTeamId,
    );
    if (sellerMatch) return sellerMatch;
  }

  return candidates.reduce((best, t) => {
    const bestDiff = Math.abs(new Date(best.Deadline).getTime() - storedMs);
    const diff = Math.abs(new Date(t.Deadline).getTime() - storedMs);
    return diff < bestDiff ? t : best;
  });
}

export type TransferPlayerForResolve = {
  id: number;
  playerId: number;
  status: string;
  deadline: string | null;
  sellerTeamId: number | null;
  finalPrice?: number | null;
};

export type ResolveOutcome = "sold" | "not_sold" | "still_listed" | "skipped";

export async function resolveOnePlayer(
  prisma: PrismaClient,
  chpp: ChppClient,
  tp: TransferPlayerForResolve,
  now: Date,
): Promise<ResolveOutcome> {
  if (tp.status === TRANSFER_STATUS.SOLD && tp.finalPrice != null) {
    return "skipped";
  }

  const storedDeadlineUtc = normalizeDeadline(tp.deadline ?? "");
  const deadlinePassed =
    !!storedDeadlineUtc && new Date(storedDeadlineUtc) < now;

  if (tp.status === TRANSFER_STATUS.LISTED && !deadlinePassed) {
    return "still_listed";
  }

  let transfers;
  try {
    transfers = await chpp.getPlayerTransfers(tp.playerId);
  } catch (err) {
    console.error(`Failed to fetch transfers for player ${tp.playerId}:`, err);
    return "skipped";
  }

  const matchingTransfer = findMatchingTransfer(
    transfers.Transfers,
    storedDeadlineUtc,
    tp.sellerTeamId,
  );

  console.log(
    `Player ${tp.playerId}: stored="${tp.deadline}" → normalised="${storedDeadlineUtc}", ` +
      `api deadlines=[${transfers.Transfers.map((t) => `${t.Deadline}(price=${t.Price})`).join(", ")}], ` +
      `matched=${!!matchingTransfer}, matchedDeadline=${matchingTransfer?.Deadline}, price=${matchingTransfer?.Price}`,
  );

  if (matchingTransfer && matchingTransfer.Price > 0) {
    await prisma.transferPlayer.update({
      where: { id: tp.id },
      data: {
        status: TRANSFER_STATUS.SOLD,
        finalPrice: matchingTransfer.Price,
        buyerTeamId: matchingTransfer.Buyer.BuyerTeamID,
        buyerTeamName: matchingTransfer.Buyer.BuyerTeamName,
        deadline: storedDeadlineUtc,
      },
    });
    return "sold";
  }

  await prisma.transferPlayer.update({
    where: { id: tp.id },
    data: { status: TRANSFER_STATUS.NOT_SOLD, deadline: storedDeadlineUtc },
  });
  return "not_sold";
}
