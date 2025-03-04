/*
  # Update Genesis Invitational Results

  1. Changes
    - Update tournament results to apply winner bonus rules correctly
    - Add $10 bonus to Alab's earnings (tournament winner bonus)
    - Subtract $10 from TG's earnings (last place team pays bonus)

  2. Details
    - Alab had the tournament winner and should receive a $10 bonus
    - TG was in last place and should pay the $10 bonus
*/

-- Update Alab's results to include the winner bonus
UPDATE tournament_results
SET 
  winner_bonus = 10,
  earnings = earnings + 10
WHERE tournament_id = 647  -- Genesis Invitational
AND team_name = 'Alab';

-- Update TG's results to reflect paying the bonus
UPDATE tournament_results
SET earnings = earnings - 10
WHERE tournament_id = 647  -- Genesis Invitational
AND team_name = 'TG';