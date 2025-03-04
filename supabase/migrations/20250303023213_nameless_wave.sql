-- Drop existing policies to prevent recursion
DROP POLICY IF EXISTS "View league members" ON league_members;
DROP POLICY IF EXISTS "Manage league members" ON league_members;
DROP POLICY IF EXISTS "View public and member leagues" ON leagues;

-- Create simplified league policies
CREATE POLICY "View leagues"
  ON leagues
  FOR SELECT
  USING (true);

-- Create simplified member policies
CREATE POLICY "View league members"
  ON league_members
  FOR SELECT
  USING (true);

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

-- Add function to check member permissions
CREATE OR REPLACE FUNCTION check_member_permissions(league_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = $1
    AND user_id = $2
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql;