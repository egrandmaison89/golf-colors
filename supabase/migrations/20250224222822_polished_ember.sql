/*
  # Update tournament results table

  1. Add new columns to existing table
  2. Update constraints and indexes
  3. Update RLS policies
*/

-- Add new columns to tournament_results
ALTER TABLE tournament_results
ADD COLUMN IF NOT EXISTS team_color text NOT NULL DEFAULT 'Blue',
ADD COLUMN IF NOT EXISTS total_score integer,
ADD COLUMN IF NOT EXISTS place integer,
ADD COLUMN IF NOT EXISTS earnings numeric(10,2),
ADD COLUMN IF NOT EXISTS winner_bonus numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT now();

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can view tournament results" ON tournament_results;
DROP POLICY IF EXISTS "Authenticated users can insert tournament results" ON tournament_results;
DROP POLICY IF EXISTS "Authenticated users can update tournament results" ON tournament_results;

CREATE POLICY "Anyone can view tournament results"
  ON tournament_results
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tournament results"
  ON tournament_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tournament results"
  ON tournament_results
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);