/*
  # Store WM Phoenix Open Results
  
  1. Insert tournament results for WM Phoenix Open
  2. Insert player results for all drafted players
  3. Insert team results with final scores and payouts
*/

-- Insert tournament results
INSERT INTO tournament_results (
  tournament_id,
  winning_team_name,
  winning_score,
  total_payouts,
  completed_at
) VALUES (
  647, -- WM Phoenix Open ID
  'Red Team',
  -3,
  30,
  (NOW() - interval '1 day')
);

-- Get the tournament_result_id
DO $$ 
DECLARE
  result_id uuid;
BEGIN
  SELECT id INTO result_id FROM tournament_results WHERE tournament_id = 647;

  -- Insert player results
  INSERT INTO tournament_player_results (
    tournament_result_id,
    player_id,
    player_name,
    team_name,
    final_score,
    status
  ) VALUES
    (result_id, 1, 'Rory McIlroy', 'Red Team', -8, 'active'),
    (result_id, 2, 'Jordan Spieth', 'Red Team', 2, 'active'),
    (result_id, 3, 'Brooks Koepka', 'Red Team', 3, 'active'),
    (result_id, 4, 'Jon Rahm', 'Blue Team', -4, 'active'),
    (result_id, 5, 'Justin Thomas', 'Blue Team', 4, 'active'),
    (result_id, 6, 'Scottie Scheffler', 'Blue Team', 6, 'active'),
    (result_id, 7, 'Collin Morikawa', 'Green Team', -1, 'active'),
    (result_id, 8, 'Patrick Cantlay', 'Green Team', 8, 'active'),
    (result_id, 9, 'Xander Schauffele', 'Green Team', 3, 'active');

  -- Insert team results
  INSERT INTO tournament_team_results (
    tournament_result_id,
    team_name,
    final_score,
    rank,
    payout,
    bonus_payout
  ) VALUES
    (result_id, 'Red Team', -3, 1, 30, 0),
    (result_id, 'Blue Team', 6, 2, -9, 0),
    (result_id, 'Green Team', 10, 3, -13, 0);
END $$;