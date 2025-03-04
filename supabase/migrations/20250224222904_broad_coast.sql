/*
  # Fix tournament results schema

  1. Drop existing tables with dependencies
  2. Create new tournament results table
  3. Add RLS policies
*/

-- Drop existing tables in correct order
DROP TABLE IF EXISTS tournament_player_results CASCADE;
DROP TABLE IF EXISTS tournament_team_results CASCADE;
DROP TABLE IF EXISTS tournament_results CASCADE;
DROP TABLE IF EXISTS tournament_stats CASCADE;

-- Create tournament results table
CREATE TABLE tournament_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id integer NOT NULL REFERENCES tournament_cache(tournament_id),
  team_name text NOT NULL,
  team_color text NOT NULL DEFAULT 'Blue',
  total_score integer NOT NULL,
  place integer NOT NULL,
  earnings numeric(10,2) NOT NULL DEFAULT 0,
  winner_bonus numeric(10,2) NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, team_name)
);

-- Enable RLS
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tournament results"
  ON tournament_results
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tournament results"
  ON tournament_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);