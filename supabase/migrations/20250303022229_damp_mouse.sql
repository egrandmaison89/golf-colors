-- Drop and recreate league policies to fix access control
DROP POLICY IF EXISTS "Public leagues are viewable by everyone" ON leagues;
DROP POLICY IF EXISTS "Users can create leagues" ON leagues;
DROP POLICY IF EXISTS "League owners and admins can update leagues" ON leagues;

-- Create new league policies
CREATE POLICY "Anyone can view public leagues"
  ON leagues
  FOR SELECT
  USING (
    is_private = false OR
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = id
    )
  );

CREATE POLICY "Authenticated users can create leagues"
  ON leagues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "League owners and admins can update leagues"
  ON leagues
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = id 
      AND role IN ('owner', 'admin')
    )
  );

-- Drop and recreate league member policies
DROP POLICY IF EXISTS "Members can view league members" ON league_members;
DROP POLICY IF EXISTS "League owners and admins can manage members" ON league_members;

-- Create new member policies
CREATE POLICY "Anyone can view league members"
  ON league_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_id
      AND (
        is_private = false OR
        auth.uid() IN (
          SELECT user_id 
          FROM league_members 
          WHERE league_id = leagues.id
        )
      )
    )
  );

CREATE POLICY "League owners and admins can manage members"
  ON league_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_id = league_members.league_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Add function to handle league member changes
CREATE OR REPLACE FUNCTION handle_league_member_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent removing the last owner
  IF TG_OP = 'DELETE' AND OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM league_members
      WHERE league_id = OLD.league_id
      AND role = 'owner'
      AND id != OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last owner';
    END IF;
  END IF;

  -- For updates, ensure valid role changes
  IF TG_OP = 'UPDATE' THEN
    -- Prevent changing owner role if last owner
    IF OLD.role = 'owner' AND NEW.role != 'owner' THEN
      IF NOT EXISTS (
        SELECT 1 FROM league_members
        WHERE league_id = NEW.league_id
        AND role = 'owner'
        AND id != NEW.id
      ) THEN
        RAISE EXCEPTION 'Cannot change role of last owner';
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add trigger for member changes
DROP TRIGGER IF EXISTS handle_league_member_changes_trigger ON league_members;
CREATE TRIGGER handle_league_member_changes_trigger
BEFORE UPDATE OR DELETE ON league_members
FOR EACH ROW
EXECUTE FUNCTION handle_league_member_changes();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_league_members_league_user ON league_members(league_id, user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_role_user ON league_members(role, user_id);
CREATE INDEX IF NOT EXISTS idx_leagues_owner ON leagues(owner_id);
CREATE INDEX IF NOT EXISTS idx_leagues_private ON leagues(is_private);

-- Add function to auto-clean expired invites
CREATE OR REPLACE FUNCTION auto_clean_expired_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM league_invites WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add trigger to clean expired invites on access
CREATE OR REPLACE FUNCTION clean_invites_on_access()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM auto_clean_expired_invites();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clean_invites_on_access_trigger
AFTER INSERT ON league_invites
FOR EACH STATEMENT
EXECUTE FUNCTION clean_invites_on_access();