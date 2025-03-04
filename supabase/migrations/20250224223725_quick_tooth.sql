/*
  # Update Tournament Results Schema and Data

  1. Changes
    - Add columns to track tournament winner and bonus details
    - Update existing results to properly reflect winner bonuses
    - Add constraints to ensure data integrity

  2. Details
    - Add tournament_winner_id column to store the winning player's ID
    - Add winner_team_name column to store which team had the winner
    - Add winner_rank column to store the winner's rank within their team
    - Recalculate bonuses based on winner's team rank
*/

-- Add new columns for tracking tournament winner details
ALTER TABLE tournament_results
ADD COLUMN IF NOT EXISTS tournament_winner_id integer,
ADD COLUMN IF NOT EXISTS winner_team_name text,
ADD COLUMN IF NOT EXISTS winner_rank integer;

-- Function to calculate winner bonus based on rank
CREATE OR REPLACE FUNCTION calculate_winner_bonus(winner_rank integer)
RETURNS numeric AS $$
BEGIN
  RETURN CASE
    WHEN winner_rank = 0 THEN 10  -- Highest ranked player
    WHEN winner_rank = 1 THEN 20  -- Second ranked player
    WHEN winner_rank = 2 THEN 30  -- Third ranked player
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;

-- Update Genesis Invitational results
WITH tournament_data AS (
  SELECT 
    647 as tournament_id,  -- Genesis Invitational
    11 as winner_id,      -- Tournament winner player ID
    'Alab' as winner_team,
    1 as winner_rank      -- Second highest ranked on team
)
UPDATE tournament_results
SET
  tournament_winner_id = tournament_data.winner_id,
  winner_team_name = tournament_data.winner_team,
  winner_rank = tournament_data.winner_rank,
  winner_bonus = calculate_winner_bonus(tournament_data.winner_rank),
  earnings = CASE
    WHEN team_name = tournament_data.winner_team THEN 
      earnings + calculate_winner_bonus(tournament_data.winner_rank)
    WHEN place = (SELECT COUNT(*) FROM tournament_results WHERE tournament_id = 647) THEN
      earnings - calculate_winner_bonus(tournament_data.winner_rank)
    ELSE earnings
  END
FROM tournament_data
WHERE tournament_results.tournament_id = tournament_data.tournament_id;