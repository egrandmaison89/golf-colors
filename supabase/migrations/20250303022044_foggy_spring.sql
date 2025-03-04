-- Drop and recreate league member policies to fix recursion
DROP POLICY IF EXISTS "Users can view members of their leagues" ON league_members;
DROP POLICY IF EXISTS "League owners and admins can manage members" ON league_members;

-- Create new policies without circular references
CREATE POLICY "Anyone can view public league members"
  ON league_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_members.league_id
      AND is_private = false
    )
  );

CREATE POLICY "Members can view their league members"
  ON league_members
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_members.league_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "League owners can manage members"
  ON league_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_members.league_id
      AND owner_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON league_members(user_id);