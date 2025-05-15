export interface Tournament {
  TournamentID: number;
  Name: string;
  Venue: string;
  Location: string;
  StartDate: string;
  EndDate: string;
}

export interface Player {
  PlayerID: number;
  FirstName: string;
  LastName: string;
  TotalScore: number;
  IsWithdrawn: boolean;
  TotalStrokes: number;
  Par: number;
  PlayerRoundScore: PlayerRound[];
  // Biographical fields
  BirthDate?: string;
  BirthCity?: string;
  BirthState?: string;
  Country?: string;
  College?: string;
  HeadshotUrl?: string;
  CareerEarnings?: number;
  WorldGolfRanking?: number;
  Swings?: string;
}

export interface PlayerRound {
  PlayerRoundId: number;
  Number: number;
  Day: string;
  Par: number;
  Score: number;
  TeeTime: string | null;
  IsWithdrawn: boolean;
  Thru?: number;
}

export interface TeamPlayer {
  entry_id: string;
  player_id: number;
  profile: {
    team_name: string;
  };
}

export interface TeamScore {
  team_name: string;
  total_score: number;
  players: {
    player_id: number;
    score: number;
    status: 'active' | 'cut' | 'withdrawn';
    firstName: string;
    lastName: string;
  }[];
}