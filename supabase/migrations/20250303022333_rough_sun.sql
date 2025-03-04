-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Anyone can view league members" ON league_members;
DROP POLICY IF EXISTS "League owners and admins can manage members" ON league_members;
DROP POLICY IF EXISTS "Anyone can view public leagues" ON leagues;

-- Create simplified league policies
CREATE POLICY "View public and member leagues"
  ON leagues
  FOR SELECT
  USING (
    is_private = false OR
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_id = id
      AND user_id = auth.uid()
    )
  );

-- Create simplified member policies
CREATE POLICY "View league members"
  ON league_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_id
      AND (
        is_private = false OR
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM league_members lm2
          WHERE lm2.league_id = league_id
          AND lm2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Manage league members"
  ON league_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_id
      AND owner_id = auth.uid()
    )
  );

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_league_members_user_league ON league_members(user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_leagues_owner_private ON leagues(owner_id, is_private);