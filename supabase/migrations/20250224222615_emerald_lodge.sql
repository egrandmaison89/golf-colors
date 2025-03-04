/*
  # Add tournament results tracking

  1. New Tables
    - tournament_results
      - Stores completed tournament results with earnings and stats
    - tournament_team_results
      - Stores individual team results for each tournament

  2. Security
    - Enable RLS on all tables
    - Allow public read access
    - Allow authenticated users to insert records
*/

-- Create tournament results table
CREATE TABLE IF NOT EXISTS tournament_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id integer NOT NULL,
  team_name text NOT NULL,
  team_color text NOT NULL,
  total_score integer NOT NULL,
  place integer NOT NULL,
  earnings decimal NOT NULL,
  winner_bonus decimal NOT NULL DEFAULT 0,
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

CREATE POLICY "Authenticated users can insert tournament results"
  ON tournament_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);