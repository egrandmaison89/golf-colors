/*
  # Fix tournament results and bonus calculations
  
  1. Changes
    - Add function to calculate total earnings including bonuses
    - Add function to recalculate tournament results
    - Add trigger to maintain earnings consistency
*/

-- Drop existing functions and triggers first
DROP TRIGGER IF EXISTS earnings_consistency_trigger ON tournament_results;
DROP FUNCTION IF EXISTS maintain_earnings_consistency() CASCADE;
DROP FUNCTION IF EXISTS calculate_total_earnings(numeric, numeric) CASCADE;

-- Function to calculate total earnings including bonuses
CREATE OR REPLACE FUNCTION calculate_total_earnings(
  p_earnings numeric,
  p_winner_bonus numeric
)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE(p_earnings, 0) + COALESCE(p_winner_bonus, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to maintain earnings consistency
CREATE OR REPLACE FUNCTION maintain_earnings_consistency()
RETURNS trigger AS $$
BEGIN
  -- Calculate total earnings including bonuses
  NEW.earnings = calculate_total_earnings(NEW.earnings, NEW.winner_bonus);
  
  -- If this is a winning team with a bonus, ensure losing teams pay
  IF NEW.winner_bonus > 0 THEN
    -- Get the last place team
    UPDATE tournament_results
    SET earnings = earnings - NEW.winner_bonus
    WHERE tournament_id = NEW.tournament_id
    AND place = (
      SELECT MAX(place)
      FROM tournament_results
      WHERE tournament_id = NEW.tournament_id
    )
    AND team_name != NEW.team_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for earnings consistency
CREATE TRIGGER earnings_consistency_trigger
BEFORE INSERT OR UPDATE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION maintain_earnings_consistency();

-- Recalculate all existing tournament results
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT tournament_id 
    FROM tournament_results 
    WHERE winner_bonus > 0
  ) LOOP
    -- Get winning team info
    WITH winner AS (
      SELECT team_name, winner_bonus
      FROM tournament_results
      WHERE tournament_id = r.tournament_id
      AND winner_bonus > 0
      LIMIT 1
    )
    -- Update last place team to pay bonus
    UPDATE tournament_results
    SET earnings = earnings - (SELECT winner_bonus FROM winner)
    WHERE tournament_id = r.tournament_id
    AND place = (
      SELECT MAX(place)
      FROM tournament_results
      WHERE tournament_id = r.tournament_id
    )
    AND team_name != (SELECT team_name FROM winner);
  END LOOP;
END $$;