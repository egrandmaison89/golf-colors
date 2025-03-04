export interface League {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  invite_code: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile?: {
    team_name: string;
    team_color: string;
  };
}

export interface LeagueInvite {
  id: string;
  league_id: string;
  email: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
}

export interface LeagueTournament {
  id: string;
  league_id: string;
  tournament_id: number;
  entry_fee: number;
  created_at: string;
  tournament?: {
    Name: string;
    Venue: string;
    StartDate: string;
    EndDate: string;
  };
}