-- Drop and recreate league member policies to fix recursion
DROP POLICY IF EXISTS "Members can view their league members" ON league_members;
DROP POLICY IF EXISTS "League owners can manage members" ON league_members;

-- Create new policies with better access control
CREATE POLICY "Members can view league members"
  ON league_members
  FOR SELECT
  USING (
    -- Allow if user is a member of the league
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = league_members.league_id
      AND lm.user_id = auth.uid()
    )
    OR
    -- Or if the league is public
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_members.league_id
      AND l.is_private = false
    )
  );

CREATE POLICY "League owners and admins can manage members"
  ON league_members
  FOR ALL
  TO authenticated
  USING (
    -- Check if user is owner or admin
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = league_members.league_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
    )
  );

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_league_members_role ON league_members(role);
CREATE INDEX IF NOT EXISTS idx_leagues_is_private ON leagues(is_private);

-- Add function to validate member roles
CREATE OR REPLACE FUNCTION validate_member_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure role is valid
  IF NEW.role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: must be owner, admin, or member';
  END IF;

  -- Prevent changing owner role if last owner
  IF TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM league_members
      WHERE league_id = NEW.league_id
      AND role = 'owner'
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove last owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for role validation
CREATE TRIGGER validate_member_role_trigger
BEFORE INSERT OR UPDATE ON league_members
FOR EACH ROW
EXECUTE FUNCTION validate_member_role();