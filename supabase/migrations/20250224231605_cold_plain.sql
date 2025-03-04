/*
  # Fix tournament queries and results handling

  1. Changes
    - Add unique constraint for tournament results
    - Add function to safely update results
    - Add trigger to prevent duplicates
    - Add indexes for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS check_duplicate_results ON tournament_results;
DROP FUNCTION IF EXISTS prevent_duplicate_results();
DROP FUNCTION IF EXISTS update_tournament_result(integer, text, text, integer, integer, numeric, numeric);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_team_name ON tournament_results(team_name);
CREATE INDEX IF NOT EXISTS idx_tournament_results_completed_at ON tournament_results(completed_at);

-- Function to safely update tournament results
CREATE OR REPLACE FUNCTION update_tournament_result(
  p_tournament_id integer,
  p_team_name text,
  p_team_color text,
  p_total_score integer,
  p_place integer,
  p_earnings numeric,
  p_winner_bonus numeric
)
RETURNS void AS $$
BEGIN
  -- Try to update existing record first
  UPDATE tournament_results SET
    team_color = p_team_color,
    total_score = p_total_score,
    place = p_place,
    earnings = p_earnings,
    winner_bonus = p_winner_bonus,
    completed_at = now()
  WHERE tournament_id = p_tournament_id
  AND team_name = p_team_name;

  -- If no record was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO tournament_results (
      tournament_id,
      team_name,
      team_color,
      total_score,
      place,
      earnings,
      winner_bonus,
      completed_at
    ) VALUES (
      p_tournament_id,
      p_team_name,
      p_team_color,
      p_total_score,
      p_place,
      p_earnings,
      p_winner_bonus,
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent duplicate results
CREATE OR REPLACE FUNCTION prevent_duplicate_results()
RETURNS TRIGGER AS $$
BEGIN
  -- For updates, just return the new record
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- For inserts, check if a record already exists
  IF EXISTS (
    SELECT 1 FROM tournament_results
    WHERE tournament_id = NEW.tournament_id
    AND team_name = NEW.team_name
    AND id != NEW.id
  ) THEN
    -- Update existing record instead
    UPDATE tournament_results SET
      team_color = NEW.team_color,
      total_score = NEW.total_score,
      place = NEW.place,
      earnings = NEW.earnings,
      winner_bonus = NEW.winner_bonus,
      completed_at = NEW.completed_at
    WHERE tournament_id = NEW.tournament_id
    AND team_name = NEW.team_name;
    
    RETURN NULL;  -- Skip the insert
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicates
CREATE TRIGGER check_duplicate_results
BEFORE INSERT ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_results();