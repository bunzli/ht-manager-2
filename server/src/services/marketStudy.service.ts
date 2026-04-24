import { PrismaClient } from "@prisma/client";
import { ChppClient } from "../chpp/client";
import {
  TransferSearchParams,
  TransferSearchResult,
} from "../chpp/types";
import { TRANSFER_STATUS, MARKET_STUDY_STATUS } from "../lib/constants";
import { resolveOnePlayer } from "./transferResolver";
import { aggregateSoldPrices } from "./soldPriceAggregator";

async function fetchAllPages(
  chpp: ChppClient,
  params: TransferSearchParams,
): Promise<TransferSearchResult[]> {
  const pageSize = 100;
  let pageIndex = 0;
  const allResults: TransferSearchResult[] = [];

  while (true) {
    const response = await chpp.searchTransfers({
      ...params,
      pageSize,
      pageIndex,
    });

    allResults.push(...response.Results);

    const totalItems = response.ItemCount;
    const fetched = (pageIndex + 1) * pageSize;

    if (
      response.Results.length < pageSize ||
      (totalItems !== -1 && fetched >= totalItems)
    ) {
      break;
    }

    pageIndex++;
  }

  return allResults;
}

export async function runSearch(
  chpp: ChppClient,
  searchParams: TransferSearchParams,
  specialties: number[],
) {
  if (specialties.length === 0) {
    const results = await fetchAllPages(chpp, searchParams);
    return {
      ItemCount: results.length,
      PageSize: 25,
      PageIndex: 0,
      Results: results,
    };
  }

  const allBySpecialty = await Promise.all(
    specialties.map((s) =>
      fetchAllPages(chpp, { ...searchParams, specialty: s }),
    ),
  );

  const seen = new Set<number>();
  const merged: TransferSearchResult[] = [];
  for (const results of allBySpecialty) {
    for (const result of results) {
      if (!seen.has(result.PlayerId)) {
        seen.add(result.PlayerId);
        merged.push(result);
      }
    }
  }

  return {
    ItemCount: merged.length,
    PageSize: 25,
    PageIndex: 0,
    Results: merged,
  };
}

function resultToPlayerDetails(r: TransferSearchResult, now: Date) {
  const d = r.Details;
  return {
    playerId: r.PlayerId,
    fetchedAt: now,
    firstName: r.FirstName,
    nickName: r.NickName,
    lastName: r.LastName,
    age: d?.Age ?? 0,
    ageDays: d?.AgeDays ?? 0,
    tsi: d?.TSI ?? 0,
    playerForm: d?.PlayerForm ?? 0,
    experience: d?.Experience ?? 0,
    loyalty: 0,
    leadership: d?.Leadership ?? 0,
    salary: d?.Salary ?? 0,
    specialty: d?.Specialty ?? 0,
    cards: d?.Cards ?? 0,
    injuryLevel: d?.InjuryLevel ?? -1,
    staminaSkill: d?.StaminaSkill ?? 0,
    keeperSkill: d?.KeeperSkill ?? 0,
    playmakerSkill: d?.PlaymakerSkill ?? 0,
    scorerSkill: d?.ScorerSkill ?? 0,
    passingSkill: d?.PassingSkill ?? 0,
    wingerSkill: d?.WingerSkill ?? 0,
    defenderSkill: d?.DefenderSkill ?? 0,
    setPiecesSkill: d?.SetPiecesSkill ?? 0,
  };
}

async function createTransferPlayer(
  prisma: PrismaClient,
  r: TransferSearchResult,
  studyId: number,
  now: Date,
) {
  const details = await prisma.playerDetails.create({
    data: resultToPlayerDetails(r, now),
  });

  await prisma.transferPlayer.create({
    data: {
      playerId: r.PlayerId,
      marketStudyId: studyId,
      playerDetailsId: details.id,
      status: TRANSFER_STATUS.LISTED,
      askingPrice: r.AskingPrice,
      highestBid: r.HighestBid,
      deadline: r.Deadline,
      sellerTeamId: r.SellerTeam.TeamID,
      sellerTeamName: r.SellerTeam.TeamName,
    },
  });
}

export async function persistSearchResults(
  prisma: PrismaClient,
  studyId: number,
  results: TransferSearchResult[],
  existingPlayers: Map<number, number>,
) {
  const now = new Date();
  let added = 0;

  for (const r of results) {
    const existingId = existingPlayers.get(r.PlayerId);

    if (existingId !== undefined) {
      await prisma.transferPlayer.updateMany({
        where: { id: existingId, status: TRANSFER_STATUS.LISTED },
        data: { askingPrice: r.AskingPrice, highestBid: r.HighestBid },
      });
      continue;
    }

    await createTransferPlayer(prisma, r, studyId, now);
    added++;
  }

  return added;
}

function parseStoredParams(raw: string): {
  searchParams: TransferSearchParams;
  specialties: number[];
} {
  const parsed = JSON.parse(raw);
  const { specialties, ...searchParams } = parsed;
  return {
    searchParams: searchParams as TransferSearchParams,
    specialties: Array.isArray(specialties) ? specialties : [],
  };
}

function getStudyWithPlayers(prisma: PrismaClient, id: number) {
  return prisma.marketStudy.findUnique({
    where: { id },
    include: {
      transferPlayers: {
        include: { playerDetails: true },
        orderBy: { createdAt: "desc" },
      },
      customCharts: { orderBy: { createdAt: "asc" } },
    },
  });
}

function buildStudyResponse(
  study: NonNullable<Awaited<ReturnType<typeof getStudyWithPlayers>>>,
) {
  const soldPlayers = study.transferPlayers.filter(
    (p) => p.status === TRANSFER_STATUS.SOLD && p.finalPrice != null,
  );

  const { priceByAge, priceBySpecialty } = aggregateSoldPrices(soldPlayers);

  const customCharts = (study.customCharts ?? []).map((c) => ({
    id: c.id,
    marketStudyId: c.marketStudyId,
    groupBy: c.groupBy,
    filters: JSON.parse(c.filters) as { field: string; value: number }[],
  }));

  return {
    study: {
      id: study.id,
      name: study.name,
      searchParams: study.searchParams,
      status: study.status,
      createdAt: study.createdAt,
      updatedAt: study.updatedAt,
    },
    players: study.transferPlayers,
    priceByAge,
    priceBySpecialty,
    customCharts,
  };
}

export async function createStudy(
  prisma: PrismaClient,
  chpp: ChppClient,
  name: string,
  searchParams: TransferSearchParams,
  specialties: number[],
) {
  const study = await prisma.marketStudy.create({
    data: {
      name,
      searchParams: JSON.stringify({ ...searchParams, specialties }),
      status: MARKET_STUDY_STATUS.ACTIVE,
    },
  });

  const searchResults = await runSearch(chpp, searchParams, specialties);
  const added = await persistSearchResults(
    prisma,
    study.id,
    searchResults.Results,
    new Map(),
  );

  const result = await prisma.marketStudy.findUnique({
    where: { id: study.id },
    include: { transferPlayers: { include: { playerDetails: true } } },
  });

  return { ...result, _counts: { total: added, added } };
}

export async function listStudies(prisma: PrismaClient) {
  const studies = await prisma.marketStudy.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      transferPlayers: {
        select: { status: true, finalPrice: true },
      },
    },
  });

  return studies.map((s) => {
    const players = s.transferPlayers;
    const soldPlayers = players.filter(
      (p) => p.status === TRANSFER_STATUS.SOLD,
    );
    return {
      id: s.id,
      name: s.name,
      searchParams: s.searchParams,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      playerCount: players.length,
      soldCount: soldPlayers.length,
      listedCount: players.filter((p) => p.status === TRANSFER_STATUS.LISTED)
        .length,
      expiredCount: players.filter(
        (p) => p.status === TRANSFER_STATUS.EXPIRED,
      ).length,
      avgFinalPrice:
        soldPlayers.length > 0
          ? Math.round(
              soldPlayers.reduce((sum, p) => sum + (p.finalPrice ?? 0), 0) /
                soldPlayers.length,
            )
          : null,
    };
  });
}

export async function getStudyDetail(prisma: PrismaClient, id: number) {
  const study = await getStudyWithPlayers(prisma, id);
  if (!study) return null;
  return buildStudyResponse(study);
}

export async function updateStudyPlayers(
  prisma: PrismaClient,
  chpp: ChppClient,
  id: number,
) {
  const study = await prisma.marketStudy.findUnique({
    where: { id },
    include: {
      transferPlayers: {
        select: {
          id: true,
          playerId: true,
          status: true,
          deadline: true,
          sellerTeamId: true,
        },
      },
    },
  });

  if (!study) return null;

  const { searchParams, specialties } = parseStoredParams(study.searchParams);
  const searchResults = await runSearch(chpp, searchParams, specialties);
  const searchResultMap = new Map(
    searchResults.Results.map((r) => [r.PlayerId, r]),
  );

  const allExistingMap = new Map(
    study.transferPlayers.map((p) => [p.playerId, p]),
  );
  const listedInDb = study.transferPlayers.filter(
    (p) => p.status === TRANSFER_STATUS.LISTED,
  );

  const now = new Date();
  let newPlayersAdded = 0;

  for (const r of searchResults.Results) {
    const existing = allExistingMap.get(r.PlayerId);
    if (existing) {
      if (existing.status === TRANSFER_STATUS.LISTED) {
        await prisma.transferPlayer.update({
          where: { id: existing.id },
          data: { askingPrice: r.AskingPrice, highestBid: r.HighestBid },
        });
      }
    } else {
      await createTransferPlayer(prisma, r, id, now);
      newPlayersAdded++;
    }
  }

  const delistedPlayers = listedInDb.filter(
    (tp) => !searchResultMap.has(tp.playerId),
  );

  if (delistedPlayers.length > 0) {
    await prisma.transferPlayer.updateMany({
      where: { id: { in: delistedPlayers.map((tp) => tp.id) } },
      data: { status: TRANSFER_STATUS.ENDED },
    });
  }

  const playersToResolve = await prisma.transferPlayer.findMany({
    where: {
      marketStudyId: id,
      status: {
        in: [TRANSFER_STATUS.ENDED, TRANSFER_STATUS.EXPIRED],
      },
    },
    select: {
      id: true,
      playerId: true,
      status: true,
      deadline: true,
      sellerTeamId: true,
      finalPrice: true,
    },
  });

  let soldCount = 0;
  let notSoldCount = 0;

  for (const tp of playersToResolve) {
    const outcome = await resolveOnePlayer(prisma, chpp, tp, now);
    if (outcome === "sold") soldCount++;
    else if (outcome === "not_sold") notSoldCount++;
  }

  const updated = await getStudyWithPlayers(prisma, id);
  const response = buildStudyResponse(updated!);

  return {
    ...response,
    _updateResult: {
      newPlayersAdded,
      updatedListed: searchResults.Results.length - newPlayersAdded,
      ended: delistedPlayers.length,
      resolved: playersToResolve.length,
      sold: soldCount,
      notSold: notSoldCount,
    },
  };
}

export async function bulkResolve(
  prisma: PrismaClient,
  chpp: ChppClient,
  studyId: number,
  ids: number[],
) {
  const transferPlayers = await prisma.transferPlayer.findMany({
    where: { id: { in: ids }, marketStudyId: studyId },
    select: {
      id: true,
      playerId: true,
      status: true,
      deadline: true,
      sellerTeamId: true,
      finalPrice: true,
    },
  });

  const now = new Date();
  let soldCount = 0;
  let notSoldCount = 0;
  let stillListedCount = 0;

  for (const tp of transferPlayers) {
    const outcome = await resolveOnePlayer(prisma, chpp, tp, now);
    if (outcome === "sold") soldCount++;
    else if (outcome === "not_sold") notSoldCount++;
    else if (outcome === "still_listed") stillListedCount++;
  }

  const updatedRows = await prisma.transferPlayer.findMany({
    where: { id: { in: ids }, marketStudyId: studyId },
    include: { playerDetails: true },
  });

  return {
    players: updatedRows,
    _result: {
      checked: transferPlayers.length,
      sold: soldCount,
      notSold: notSoldCount,
      stillListed: stillListedCount,
    },
  };
}

export async function bulkDelete(
  prisma: PrismaClient,
  studyId: number,
  ids: number[],
) {
  const transferPlayers = await prisma.transferPlayer.findMany({
    where: { id: { in: ids }, marketStudyId: studyId },
    select: { id: true, playerDetailsId: true },
  });

  if (transferPlayers.length === 0) return { deleted: 0 };

  const validIds = transferPlayers.map((tp) => tp.id);
  const playerDetailsIds = transferPlayers.map((tp) => tp.playerDetailsId);

  await prisma.transferPlayer.deleteMany({
    where: { id: { in: validIds } },
  });

  for (const pdId of playerDetailsIds) {
    const refCount = await prisma.transferPlayer.count({
      where: { playerDetailsId: pdId },
    });
    if (refCount === 0) {
      await prisma.playerDetails
        .delete({ where: { id: pdId } })
        .catch(() => {});
    }
  }

  return { deleted: validIds.length };
}

export async function deleteUnsoldPlayers(
  prisma: PrismaClient,
  studyId: number,
) {
  const study = await prisma.marketStudy.findUnique({ where: { id: studyId } });
  if (!study) return null;

  const unsold = await prisma.transferPlayer.findMany({
    where: {
      marketStudyId: studyId,
      status: {
        in: [
          TRANSFER_STATUS.NOT_SOLD,
          TRANSFER_STATUS.ENDED,
          TRANSFER_STATUS.EXPIRED,
        ],
      },
    },
    select: { id: true, playerDetailsId: true },
  });

  if (unsold.length === 0) return { deleted: 0 };

  const ids = unsold.map((p) => p.id);
  const playerDetailsIds = unsold.map((p) => p.playerDetailsId);

  await prisma.transferPlayer.deleteMany({ where: { id: { in: ids } } });

  for (const pdId of playerDetailsIds) {
    const refCount = await prisma.transferPlayer.count({
      where: { playerDetailsId: pdId },
    });
    if (refCount === 0) {
      await prisma.playerDetails
        .delete({ where: { id: pdId } })
        .catch(() => {});
    }
  }

  return { deleted: ids.length };
}

export async function createCustomChart(
  prisma: PrismaClient,
  studyId: number,
  groupBy: string,
  filters: { field: string; value: number }[],
) {
  const study = await prisma.marketStudy.findUnique({
    where: { id: studyId },
  });
  if (!study) return null;

  const chart = await prisma.customChart.create({
    data: {
      marketStudyId: studyId,
      groupBy,
      filters: JSON.stringify(filters),
    },
  });

  return {
    id: chart.id,
    marketStudyId: chart.marketStudyId,
    groupBy: chart.groupBy,
    filters,
  };
}

export async function deleteCustomChart(
  prisma: PrismaClient,
  studyId: number,
  chartId: number,
) {
  const chart = await prisma.customChart.findFirst({
    where: { id: chartId, marketStudyId: studyId },
  });
  if (!chart) return null;

  await prisma.customChart.delete({ where: { id: chartId } });
  return { deleted: true };
}
