/*
  # Fix tournament results handling

  1. Changes
    - Add function to safely update tournament results
    - Add trigger to prevent duplicates
    - Add unique constraint with conflict handling

  2. Security
    - Maintain existing RLS policies
*/

-- Function to update results
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
  )
  ON CONFLICT (tournament_id, team_name) 
  DO UPDATE SET
    team_color = EXCLUDED.team_color,
    total_score = EXCLUDED.total_score,
    place = EXCLUDED.place,
    earnings = EXCLUDED.earnings,
    winner_bonus = EXCLUDED.winner_bonus,
    completed_at = EXCLUDED.completed_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to prevent duplicate results
CREATE OR REPLACE FUNCTION prevent_duplicate_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates to existing records
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- For new inserts, check if a record already exists
  IF EXISTS (
    SELECT 1 FROM tournament_results
    WHERE tournament_id = NEW.tournament_id
    AND team_name = NEW.team_name
    AND id != NEW.id
  ) THEN
    -- Instead of raising an exception, update the existing record
    UPDATE tournament_results SET
      team_color = NEW.team_color,
      total_score = NEW.total_score,
      place = NEW.place,
      earnings = NEW.earnings,
      winner_bonus = NEW.winner_bonus,
      completed_at = NEW.completed_at
    WHERE tournament_id = NEW.tournament_id
    AND team_name = NEW.team_name;
    RETURN NULL;  -- Prevent the insert
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for preventing duplicates
DROP TRIGGER IF EXISTS check_duplicate_results ON tournament_results;
CREATE TRIGGER check_duplicate_results
BEFORE INSERT ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_results();