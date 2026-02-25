-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create feature_flag_users table for user-specific overrides
CREATE TABLE IF NOT EXISTS feature_flag_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(feature_flag_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flag_users_feature_flag_id ON feature_flag_users(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_users_user_id ON feature_flag_users(user_id);

-- Create updated_at trigger for feature_flags
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_users ENABLE ROW LEVEL SECURITY;

-- Policies for feature_flags table
-- Allow all authenticated users to read feature flags
CREATE POLICY "Allow authenticated users to read feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete feature flags
CREATE POLICY "Allow service role to manage feature flags"
  ON feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for feature_flag_users table
-- Allow users to read their own feature flag overrides
CREATE POLICY "Allow users to read their own feature flag overrides"
  ON feature_flag_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete feature flag user overrides
CREATE POLICY "Allow service role to manage feature flag users"
  ON feature_flag_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
