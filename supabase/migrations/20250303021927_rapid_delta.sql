-- Add realtime subscriptions for league data
ALTER TABLE leagues REPLICA IDENTITY FULL;
ALTER TABLE league_members REPLICA IDENTITY FULL;
ALTER TABLE league_tournaments REPLICA IDENTITY FULL;

-- Add function to handle member role changes
CREATE OR REPLACE FUNCTION check_league_member_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing owner role
  IF OLD.role = 'owner' AND NEW.role != 'owner' THEN
    RAISE EXCEPTION 'Cannot change league owner role';
  END IF;

  -- Ensure at least one owner exists
  IF OLD.role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = NEW.league_id
    AND role = 'owner'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'League must have at least one owner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for member role changes
CREATE TRIGGER check_league_member_role_trigger
BEFORE UPDATE ON league_members
FOR EACH ROW
EXECUTE FUNCTION check_league_member_role();

-- Add function to clean up expired invites
CREATE OR REPLACE FUNCTION clean_expired_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM league_invites
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired invites daily
SELECT cron.schedule(
  'clean-expired-invites',
  '0 0 * * *',  -- Run at midnight every day
  'SELECT clean_expired_invites()'
);