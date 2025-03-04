/*
  # Tournament Results Storage

  1. New Tables
    - `tournament_results`
      - Stores final tournament results and payouts
      - Links to tournament_cache for tournament info
      - Includes winning team and total payouts
    
    - `tournament_player_results`
      - Stores individual player results for each tournament
      - Links to tournament_results
      - Includes final scores and status
    
    - `tournament_team_results`
      - Stores team results for each tournament
      - Links to tournament_results
      - Includes final team scores, rankings, and payouts

  2. Security
    - Enable RLS on all tables
    - Allow public read access
    - Allow authenticated users to insert results
*/

-- Create tournament results table
CREATE TABLE IF NOT EXISTS tournament_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id integer NOT NULL REFERENCES tournament_cache(tournament_id),
  winning_team_name text NOT NULL,
  winning_score integer NOT NULL,
  total_payouts decimal NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id)
);

-- Create tournament player results table
CREATE TABLE IF NOT EXISTS tournament_player_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_result_id uuid REFERENCES tournament_results(id) NOT NULL,
  player_id integer NOT NULL,
  player_name text NOT NULL,
  team_name text NOT NULL,
  final_score integer NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'cut', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_result_id, player_id)
);

-- Create tournament team results table
CREATE TABLE IF NOT EXISTS tournament_team_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_result_id uuid REFERENCES tournament_results(id) NOT NULL,
  team_name text NOT NULL,
  final_score integer NOT NULL,
  rank integer NOT NULL,
  payout decimal NOT NULL,
  bonus_payout decimal NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_result_id, team_name)
);

-- Enable RLS
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_player_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to tournament results"
  ON tournament_results
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert tournament results"
  ON tournament_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read access to tournament player results"
  ON tournament_player_results
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert tournament player results"
  ON tournament_player_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public read access to tournament team results"
  ON tournament_team_results
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert tournament team results"
  ON tournament_team_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);