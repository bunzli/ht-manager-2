export interface PlayerChange {
  id: number;
  playerId: number;
  detectedAt: string;
  key: string;
  oldValue: string;
  newValue: string;
}

export interface Player {
  id: number;
  playerId: number;
  fetchedAt: string;
  firstName: string;
  nickName: string;
  lastName: string;
  playerNumber: number;
  age: number;
  ageDays: number;
  tsi: number;
  playerForm: number;
  experience: number;
  loyalty: number;
  motherClubBonus: boolean;
  leadership: number;
  salary: number;
  isAbroad: boolean;
  specialty: number;
  cards: number;
  injuryLevel: number;
  staminaSkill: number;
  keeperSkill: number;
  playmakerSkill: number;
  scorerSkill: number;
  passingSkill: number;
  wingerSkill: number;
  defenderSkill: number;
  setPiecesSkill: number;
  playerCategoryId: number;
  transferListed: boolean;
  avatarBackground: string;
  avatarLayers: string;
  positionScores: Record<string, number>;
  positionOverride: string | null;
  recentChanges: PlayerChange[];
}

export interface PlayersResponse {
  teamId: number;
  teamName: string;
  fetchedAt: string | null;
  players: Player[];
}

export interface PlayerDetailResponse {
  player: Player;
  allChanges: PlayerChange[];
}

export interface TransferSearchParams {
  ageMin: number;
  ageDaysMin?: number;
  ageMax: number;
  ageDaysMax?: number;
  skillType1: number;
  minSkillValue1: number;
  maxSkillValue1: number;
  skillType2?: number;
  minSkillValue2?: number;
  maxSkillValue2?: number;
  skillType3?: number;
  minSkillValue3?: number;
  maxSkillValue3?: number;
  skillType4?: number;
  minSkillValue4?: number;
  maxSkillValue4?: number;
  specialty?: number;
  nativeCountryId?: number;
  tsiMin?: number;
  tsiMax?: number;
  priceMin?: number;
  priceMax?: number;
  pageSize?: number;
  pageIndex?: number;
}

export interface TransferSearchResult {
  PlayerId: number;
  FirstName: string;
  NickName: string;
  LastName: string;
  NativeCountryID: number;
  AskingPrice: number;
  Deadline: string;
  HighestBid: number;
  BidderTeam?: {
    TeamID: number;
    TeamName: string;
  };
  Details?: {
    Age: number;
    AgeDays: number;
    Salary: number;
    TSI: number;
    PlayerForm: number;
    Experience: number;
    Leadership: number;
    Specialty: number;
    Cards: number;
    InjuryLevel: number;
    StaminaSkill: number;
    KeeperSkill: number;
    PlaymakerSkill: number;
    ScorerSkill: number;
    PassingSkill: number;
    WingerSkill: number;
    DefenderSkill: number;
    SetPiecesSkill: number;
  };
  SellerTeam: {
    TeamID: number;
    TeamName: string;
    LeagueId: number;
  };
}

export interface TransferSearchResponse {
  ItemCount: number;
  PageSize: number;
  PageIndex: number;
  Results: TransferSearchResult[];
}

export interface MarketStudy {
  id: number;
  name: string;
  searchParams: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketStudyListItem extends MarketStudy {
  playerCount: number;
  soldCount: number;
  listedCount: number;
  expiredCount: number;
  avgFinalPrice: number | null;
}

export interface TransferPlayerRow {
  id: number;
  playerId: number;
  marketStudyId?: number | null;
  status: "listed" | "sold" | "ended" | "not_sold" | "expired"; // "expired" is legacy
  askingPrice: number;
  highestBid: number;
  finalPrice: number | null;
  deadline: string;
  buyerTeamId: number | null;
  buyerTeamName: string | null;
  sellerTeamId: number | null;
  sellerTeamName: string | null;
  createdAt?: string;
  updatedAt?: string;
  playerDetails: {
    id: number;
    playerId: number;
    firstName: string;
    nickName: string;
    lastName: string;
    age: number;
    ageDays: number;
    tsi: number;
    playerForm: number;
    experience: number;
    leadership: number;
    salary: number;
    specialty: number;
    cards: number;
    injuryLevel: number;
    staminaSkill: number;
    keeperSkill: number;
    playmakerSkill: number;
    scorerSkill: number;
    passingSkill: number;
    wingerSkill: number;
    defenderSkill: number;
    setPiecesSkill: number;
  };
}

export interface PriceBucket {
  avgPrice: number;
  count: number;
}

export interface PriceByAge extends PriceBucket {
  age: number;
}

export interface PriceBySpecialty extends PriceBucket {
  specialty: number;
}

export interface MarketStudyDetail {
  study: MarketStudy;
  players: TransferPlayerRow[];
  priceByAge: PriceByAge[];
  priceBySpecialty: PriceBySpecialty[];
}
