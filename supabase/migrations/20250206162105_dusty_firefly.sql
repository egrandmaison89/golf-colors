/*
  # Allow anonymous access to tournament data

  1. Changes
    - Update RLS policies to allow anonymous users to view:
      - Profiles
      - Tournament entries
      - Team players
      - Draft state
      - Draft picks

  2. Security
    - Read-only access for anonymous users
    - No modification permissions for anonymous users
*/

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Anyone can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Update tournament entries policies
DROP POLICY IF EXISTS "Users can view all tournament entries" ON tournament_entries;
CREATE POLICY "Anyone can view all tournament entries"
  ON tournament_entries FOR SELECT
  USING (true);

-- Update team players policies
DROP POLICY IF EXISTS "Users can view all team players" ON team_players;
CREATE POLICY "Anyone can view all team players"
  ON team_players FOR SELECT
  USING (true);

-- Update draft state policies
DROP POLICY IF EXISTS "Users can view all draft states" ON draft_state;
CREATE POLICY "Anyone can view all draft states"
  ON draft_state FOR SELECT
  USING (true);

-- Update draft picks policies
DROP POLICY IF EXISTS "Users can view all draft picks" ON draft_picks;
CREATE POLICY "Anyone can view all draft picks"
  ON draft_picks FOR SELECT
  USING (true);