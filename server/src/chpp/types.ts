export interface ChppPlayer {
  PlayerID: number;
  FirstName: string;
  NickName: string;
  LastName: string;
  PlayerNumber: number;
  Age: number;
  AgeDays: number;
  GenderID: number;
  ArrivalDate: string;
  OwnerNotes: string;
  TSI: number;
  PlayerForm: number;
  Statement: string;
  Experience: number;
  Loyalty: number;
  MotherClubBonus: boolean;
  Leadership: number;
  Salary: number;
  IsAbroad: boolean;
  Agreeability: number;
  Aggressiveness: number;
  Honesty: number;
  LeagueGoals: number;
  CupGoals: number;
  FriendliesGoals: number;
  CareerGoals: number;
  CareerHattricks: number;
  MatchesCurrentTeam: number;
  GoalsCurrentTeam: number;
  AssistsCurrentTeam: number;
  CareerAssists: number;
  Specialty: number;
  TransferListed: boolean;
  NationalTeamID: number;
  CountryID: number;
  Caps: number;
  CapsU20: number;
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
  PlayerCategoryId: number;
  TrainerData?: {
    TrainerType: number;
    TrainerSkill: number;
    TrainerSkillLevel: number;
  };
}

export interface ChppPlayersResponse {
  TeamID: number;
  TeamName: string;
  Players: ChppPlayer[];
}

export interface ChppPlayerDetails {
  PlayerID: number;
  FirstName: string;
  NickName: string;
  LastName: string;
  PlayerNumber: number;
  Age: number;
  AgeDays: number;
  NextBirthDay: string;
  GenderID: number;
  ArrivalDate: string;
  PlayerForm: number;
  Cards: number;
  InjuryLevel: number;
  Statement: string;
  Agreeability: number;
  Aggressiveness: number;
  Honesty: number;
  Experience: number;
  Loyalty: number;
  MotherClubBonus: boolean;
  Leadership: number;
  Specialty: number;
  NativeCountryID: number;
  NativeLeagueID: number;
  NativeLeagueName: string;
  TSI: number;
  Salary: number;
  IsAbroad: boolean;
  StaminaSkill: number;
  KeeperSkill: number;
  PlaymakerSkill: number;
  ScorerSkill: number;
  PassingSkill: number;
  WingerSkill: number;
  DefenderSkill: number;
  SetPiecesSkill: number;
  Caps: number;
  CapsU20: number;
  CareerGoals: number;
  CareerHattricks: number;
  LeagueGoals: number;
  CupGoals: number;
  FriendliesGoals: number;
  MatchesCurrentTeam: number;
  GoalsCurrentTeam: number;
  AssistsCurrentTeam: number;
  CareerAssists: number;
  TransferListed: boolean;
  OwningTeam: {
    TeamID: number;
    TeamName: string;
    LeagueID: number;
  };
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

export interface PlayerTransfer {
  TransferID: number;
  Deadline: string;
  Buyer: {
    BuyerTeamID: number;
    BuyerTeamName: string;
  };
  Seller: {
    SellerTeamID: number;
    SellerTeamName: string;
  };
  Price: number;
  TSI: number;
}

export interface PlayerTransfersResponse {
  PlayerID: number;
  PlayerName: string;
  StartDate: string;
  EndDate: string;
  Transfers: PlayerTransfer[];
}

export interface ChppAvatarLayer {
  x: number;
  y: number;
  image: string;
}

export interface ChppPlayerAvatar {
  playerId: number;
  backgroundImage: string;
  layers: ChppAvatarLayer[];
}

export interface ChppAvatarsResponse {
  teamId: number;
  players: ChppPlayerAvatar[];
}
