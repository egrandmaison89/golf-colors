/*
  # Add tournament stats table
  
  1. New Tables
    - tournament_stats
      - id (uuid, primary key) 
      - tournament_id (integer, references tournament_cache)
      - team_name (text)
      - team_color (text)
      - total_score (integer)
      - place (integer)
      - earnings (decimal)
      - winner_bonus (decimal)
      - completed_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for read access
*/

-- Create tournament stats table
CREATE TABLE IF NOT EXISTS tournament_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id integer REFERENCES tournament_cache(tournament_id),
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
ALTER TABLE tournament_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tournament stats"
  ON tournament_stats
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tournament stats"
  ON tournament_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);