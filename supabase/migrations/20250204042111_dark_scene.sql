/*
  # Email Configuration Migration

  This migration adds email-related functions and triggers.
  Note: Email configuration should be done through the Supabase dashboard
  as it cannot be directly modified through SQL migrations.

  1. Changes
    - Add email templates table for storing custom email templates
    - Add audit logging for email-related events
*/

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to all users"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert welcome email template
INSERT INTO email_templates (name, subject, content)
VALUES (
  'welcome_email',
  'Welcome to Colors Cup!',
  'Thank you for joining Colors Cup! Your account has been created successfully.

Get ready to:
- Draft your dream team of golfers
- Compete for real prizes
- Track your performance across tournaments

Visit our website to start participating in tournaments today!

Best regards,
The Colors Cup Team'
) ON CONFLICT (name) DO NOTHING;

-- Create email audit log
CREATE TABLE IF NOT EXISTS email_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  template_name text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  success boolean NOT NULL,
  error_message text
);

-- Enable RLS
ALTER TABLE email_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow insert access to authenticated users"
  ON email_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow read access to own email logs"
  ON email_audit_log
  FOR SELECT
  TO authenticated
  USING (email = auth.email());