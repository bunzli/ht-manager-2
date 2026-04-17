import {
  ChppPlayer,
  ChppPlayersResponse,
  ChppPlayerDetails,
  TransferSearchResponse,
  TransferSearchResult,
  PlayerTransfersResponse,
  PlayerTransfer,
  ChppAvatarLayer,
  ChppPlayerAvatar,
  ChppAvatarsResponse,
} from "./types";

/**
 * Hattrick API datetimes are in Europe/Stockholm (CET UTC+1 / CEST UTC+2).
 * This converts the bare "YYYY-MM-DD HH:MM:SS" string to a proper UTC ISO string
 * so that clients can display it correctly in their local timezone.
 */
export function stockholmToUtcIso(dateStr: string): string {
  if (!dateStr) return dateStr;
  try {
    const normalized = dateStr.replace(" ", "T");

    // Treat the input as UTC temporarily to use as a reference for Intl
    const provisional = new Date(normalized + "Z");
    if (isNaN(provisional.getTime())) return dateStr;

    // Ask Intl what Stockholm's clock reads at that UTC moment
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(provisional);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "00";

    // Some engines return "24" for midnight with hour12:false — clamp it
    const hour = String(Math.min(parseInt(get("hour"), 10), 23)).padStart(2, "0");

    // Reconstruct as UTC to measure Stockholm's offset at that moment
    const sthlmAsUtc = new Date(
      `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}Z`,
    );
    if (isNaN(sthlmAsUtc.getTime())) return dateStr;

    const offsetMs = sthlmAsUtc.getTime() - provisional.getTime();

    // Subtract the offset from the "treated as UTC" value to get the true UTC instant
    return new Date(provisional.getTime() - offsetMs).toISOString();
  } catch {
    return dateStr;
  }
}

function toBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true";
  return Boolean(val);
}

function toInt(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isNaN(n) ? fallback : Math.floor(n);
}

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function parsePlayer(p: Record<string, unknown>): ChppPlayer {
  return {
    PlayerID: toInt(p.PlayerID),
    FirstName: String(p.FirstName ?? ""),
    NickName: String(p.NickName ?? ""),
    LastName: String(p.LastName ?? ""),
    PlayerNumber: toInt(p.PlayerNumber),
    Age: toInt(p.Age),
    AgeDays: toInt(p.AgeDays),
    GenderID: toInt(p.GenderID),
    ArrivalDate: String(p.ArrivalDate ?? ""),
    OwnerNotes: String(p.OwnerNotes ?? ""),
    TSI: toInt(p.TSI),
    PlayerForm: toInt(p.PlayerForm),
    Statement: String(p.Statement ?? ""),
    Experience: toInt(p.Experience),
    Loyalty: toInt(p.Loyalty),
    MotherClubBonus: toBool(p.MotherClubBonus),
    Leadership: toInt(p.Leadership),
    Salary: toInt(p.Salary),
    IsAbroad: toBool(p.IsAbroad),
    Agreeability: toInt(p.Agreeability),
    Aggressiveness: toInt(p.Aggressiveness),
    Honesty: toInt(p.Honesty),
    LeagueGoals: toInt(p.LeagueGoals),
    CupGoals: toInt(p.CupGoals),
    FriendliesGoals: toInt(p.FriendliesGoals),
    CareerGoals: toInt(p.CareerGoals),
    CareerHattricks: toInt(p.CareerHattricks),
    MatchesCurrentTeam: toInt(p.MatchesCurrentTeam),
    GoalsCurrentTeam: toInt(p.GoalsCurrentTeam),
    AssistsCurrentTeam: toInt(p.AssistsCurrentTeam),
    CareerAssists: toInt(p.CareerAssists),
    Specialty: toInt(p.Specialty),
    TransferListed: toBool(p.TransferListed),
    NationalTeamID: toInt(p.NationalTeamID),
    CountryID: toInt(p.CountryID),
    Caps: toInt(p.Caps),
    CapsU20: toInt(p.CapsU20),
    Cards: toInt(p.Cards),
    InjuryLevel: toInt(p.InjuryLevel, -1),
    StaminaSkill: toInt(p.StaminaSkill),
    KeeperSkill: toInt(p.KeeperSkill),
    PlaymakerSkill: toInt(p.PlaymakerSkill),
    ScorerSkill: toInt(p.ScorerSkill),
    PassingSkill: toInt(p.PassingSkill),
    WingerSkill: toInt(p.WingerSkill),
    DefenderSkill: toInt(p.DefenderSkill),
    SetPiecesSkill: toInt(p.SetPiecesSkill),
    PlayerCategoryId: toInt(p.PlayerCategoryId),
    TrainerData: p.TrainerData
      ? {
          TrainerType: toInt(
            (p.TrainerData as Record<string, unknown>).TrainerType,
          ),
          TrainerSkill: toInt(
            (p.TrainerData as Record<string, unknown>).TrainerSkill,
          ),
          TrainerSkillLevel: toInt(
            (p.TrainerData as Record<string, unknown>).TrainerSkillLevel,
          ),
        }
      : undefined,
  };
}

export function parsePlayers(data: Record<string, unknown>): ChppPlayersResponse {
  const hd = data.HattrickData as Record<string, unknown>;
  const team = hd.Team as Record<string, unknown>;
  const playerList = team.PlayerList as Record<string, unknown>;
  const rawPlayers = ensureArray(
    playerList?.Player as Record<string, unknown>[] | Record<string, unknown>,
  );

  return {
    TeamID: toInt(team.TeamID),
    TeamName: String(team.TeamName ?? ""),
    Players: rawPlayers.map(parsePlayer),
  };
}

export function parsePlayerDetails(data: Record<string, unknown>): ChppPlayerDetails {
  const hd = data.HattrickData as Record<string, unknown>;
  const p = hd.Player as Record<string, unknown>;
  const skills = (p.PlayerSkills ?? p) as Record<string, unknown>;
  const owningTeam = (p.OwningTeam ?? {}) as Record<string, unknown>;

  return {
    PlayerID: toInt(p.PlayerID),
    FirstName: String(p.FirstName ?? ""),
    NickName: String(p.NickName ?? ""),
    LastName: String(p.LastName ?? ""),
    PlayerNumber: toInt(p.PlayerNumber),
    Age: toInt(p.Age),
    AgeDays: toInt(p.AgeDays),
    NextBirthDay: String(p.NextBirthDay ?? ""),
    GenderID: toInt(p.GenderID),
    ArrivalDate: String(p.ArrivalDate ?? ""),
    PlayerForm: toInt(p.PlayerForm),
    Cards: toInt(p.Cards),
    InjuryLevel: toInt(p.InjuryLevel, -1),
    Statement: String(p.Statement ?? ""),
    Agreeability: toInt(p.Agreeability),
    Aggressiveness: toInt(p.Aggressiveness),
    Honesty: toInt(p.Honesty),
    Experience: toInt(p.Experience),
    Loyalty: toInt(p.Loyalty),
    MotherClubBonus: toBool(p.MotherClubBonus),
    Leadership: toInt(p.Leadership),
    Specialty: toInt(p.Specialty),
    NativeCountryID: toInt(p.NativeCountryID),
    NativeLeagueID: toInt(p.NativeLeagueID),
    NativeLeagueName: String(p.NativeLeagueName ?? ""),
    TSI: toInt(p.TSI),
    Salary: toInt(owningTeam.Salary),
    IsAbroad: toBool(owningTeam.IsAbroad),
    StaminaSkill: toInt(skills.StaminaSkill),
    KeeperSkill: toInt(skills.KeeperSkill),
    PlaymakerSkill: toInt(skills.PlaymakerSkill),
    ScorerSkill: toInt(skills.ScorerSkill),
    PassingSkill: toInt(skills.PassingSkill),
    WingerSkill: toInt(skills.WingerSkill),
    DefenderSkill: toInt(skills.DefenderSkill),
    SetPiecesSkill: toInt(skills.SetPiecesSkill),
    Caps: toInt(p.Caps),
    CapsU20: toInt(p.CapsU20),
    CareerGoals: toInt(p.CareerGoals),
    CareerHattricks: toInt(p.CareerHattricks),
    LeagueGoals: toInt(p.LeagueGoals),
    CupGoals: toInt(p.CupGoals),
    FriendliesGoals: toInt(p.FriendliesGoals),
    MatchesCurrentTeam: toInt(p.MatchesCurrentTeam),
    GoalsCurrentTeam: toInt(p.GoalsCurrentTeam),
    AssistsCurrentTeam: toInt(p.AssistsCurrentTeam),
    CareerAssists: toInt(p.CareerAssists),
    TransferListed: toBool(p.TransferListed),
    OwningTeam: {
      TeamID: toInt(owningTeam.TeamID),
      TeamName: String(owningTeam.TeamName ?? ""),
      LeagueID: toInt(owningTeam.LeagueID),
    },
  };
}

function parseTransferResult(r: Record<string, unknown>): TransferSearchResult {
  const details = r.Details as Record<string, unknown> | undefined;
  // SellerTeam is nested inside Details in the actual XML response
  const seller = (details?.SellerTeam ?? {}) as Record<string, unknown>;
  // BidderTeam is an empty string "" when there are no bids
  const bidder =
    r.BidderTeam && typeof r.BidderTeam === "object"
      ? (r.BidderTeam as Record<string, unknown>)
      : undefined;

  return {
    PlayerId: toInt(r.PlayerId),
    FirstName: String(r.FirstName ?? ""),
    NickName: String(r.NickName ?? ""),
    LastName: String(r.LastName ?? ""),
    NativeCountryID: toInt(r.NativeCountryID),
    AskingPrice: toInt(r.AskingPrice),
    Deadline: stockholmToUtcIso(String(r.Deadline ?? "")),
    HighestBid: toInt(r.HighestBid),
    BidderTeam: bidder?.TeamID
      ? {
          TeamID: toInt(bidder.TeamID),
          TeamName: String(bidder.TeamName ?? ""),
        }
      : undefined,
    Details: details
      ? {
          Age: toInt(details.Age),
          AgeDays: toInt(details.AgeDays),
          Salary: toInt(details.Salary),
          TSI: toInt(details.TSI),
          PlayerForm: toInt(details.PlayerForm),
          Experience: toInt(details.Experience),
          Leadership: toInt(details.Leadership),
          Specialty: toInt(details.Specialty),
          Cards: toInt(details.Cards),
          InjuryLevel: toInt(details.InjuryLevel, -1),
          StaminaSkill: toInt(details.StaminaSkill),
          KeeperSkill: toInt(details.KeeperSkill),
          PlaymakerSkill: toInt(details.PlaymakerSkill),
          ScorerSkill: toInt(details.ScorerSkill),
          PassingSkill: toInt(details.PassingSkill),
          WingerSkill: toInt(details.WingerSkill),
          DefenderSkill: toInt(details.DefenderSkill),
          SetPiecesSkill: toInt(details.SetPiecesSkill),
        }
      : undefined,
    SellerTeam: {
      TeamID: toInt(seller.TeamID),
      TeamName: String(seller.TeamName ?? ""),
      LeagueId: toInt(seller.LeagueId),
    },
  };
}

export function parseTransferSearch(data: Record<string, unknown>): TransferSearchResponse {
  const hd = data.HattrickData as Record<string, unknown>;
  // TransferResults is nested inside TransferSearch in the actual XML response
  const ts = hd.TransferSearch as Record<string, unknown>;
  const resultsContainer = ts?.TransferResults as Record<string, unknown>;
  const rawResults = ensureArray(
    resultsContainer?.TransferResult as
      | Record<string, unknown>[]
      | Record<string, unknown>,
  );

  return {
    ItemCount: toInt(ts?.ItemCount),
    PageSize: toInt(ts?.PageSize),
    PageIndex: toInt(ts?.PageIndex),
    Results: rawResults.map(parseTransferResult),
  };
}

function parseTransfer(t: Record<string, unknown>): PlayerTransfer {
  const buyer = (t.Buyer ?? {}) as Record<string, unknown>;
  const seller = (t.Seller ?? {}) as Record<string, unknown>;

  return {
    TransferID: toInt(t.TransferID),
    Deadline: stockholmToUtcIso(String(t.Deadline ?? "")),
    Buyer: {
      BuyerTeamID: toInt(buyer.BuyerTeamID),
      BuyerTeamName: String(buyer.BuyerTeamName ?? ""),
    },
    Seller: {
      SellerTeamID: toInt(seller.SellerTeamID),
      SellerTeamName: String(seller.SellerTeamName ?? ""),
    },
    Price: toInt(t.Price),
    TSI: toInt(t.TSI),
  };
}

export function parseAvatars(data: Record<string, unknown>): ChppAvatarsResponse {
  const hd = data.HattrickData as Record<string, unknown>;
  const team = hd.Team as Record<string, unknown>;
  const rawPlayers = ensureArray(
    (team?.Players as Record<string, unknown>)
      ?.Player as Record<string, unknown>[] | Record<string, unknown>,
  );

  const players: ChppPlayerAvatar[] = rawPlayers.map((p) => {
    const avatar = (p.Avatar ?? {}) as Record<string, unknown>;
    const rawLayers = ensureArray(
      avatar.Layer as Record<string, unknown>[] | Record<string, unknown>,
    );

    const layers: ChppAvatarLayer[] = rawLayers.map((l) => ({
      x: toInt(l["@_x"]),
      y: toInt(l["@_y"]),
      image: String(l.Image ?? ""),
    }));

    return {
      playerId: toInt(p.PlayerID),
      backgroundImage: String(avatar.BackgroundImage ?? ""),
      layers,
    };
  });

  return {
    teamId: toInt(team?.TeamId),
    players,
  };
}

export function parsePlayerTransfers(data: Record<string, unknown>): PlayerTransfersResponse {
  const hd = data.HattrickData as Record<string, unknown>;
  const transfers = hd.Transfers as Record<string, unknown>;
  const player = (transfers?.Player ?? {}) as Record<string, unknown>;
  const rawTransfers = ensureArray(
    transfers?.Transfer as Record<string, unknown>[] | Record<string, unknown>,
  );

  return {
    PlayerID: toInt(player.PlayerID),
    PlayerName: String(player.PlayerName ?? ""),
    StartDate: String(transfers?.StartDate ?? ""),
    EndDate: String(transfers?.EndDate ?? ""),
    Transfers: rawTransfers.map(parseTransfer),
  };
}
