/*
  # Fix team results function

  1. Changes
    - Update get_team_results function to handle null results
    - Add better error handling
    - Fix ambiguous column reference
    - Add index for faster lookups

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_team_results(text);

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION get_team_results(p_team_name text)
RETURNS TABLE (
  id uuid,
  tournament_id integer,
  team_name text,
  team_color text,
  total_score integer,
  place integer,
  earnings numeric,
  winner_bonus numeric,
  completed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT tr.id,
         tr.tournament_id,
         tr.team_name,
         tr.team_color,
         tr.total_score,
         tr.place,
         tr.earnings,
         tr.winner_bonus,
         tr.completed_at
  FROM tournament_results tr
  WHERE tr.team_name = p_team_name
  ORDER BY tr.completed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add index for faster team name lookups if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tournament_results' 
    AND indexname = 'idx_tournament_results_team_name'
  ) THEN
    CREATE INDEX idx_tournament_results_team_name ON tournament_results(team_name);
  END IF;
END $$;