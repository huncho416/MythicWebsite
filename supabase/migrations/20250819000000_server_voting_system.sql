-- Server Voting Links System
-- This migration adds a system for managing external voting/ranking links
-- where users can vote for the Minecraft server on various platforms

-- Server voting sites table
CREATE TABLE IF NOT EXISTS public.server_voting_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  voting_url text NOT NULL,
  image_url text,
  reward_description text,
  votes_per_day integer DEFAULT 1,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User vote tracking table (to track when users last voted)
CREATE TABLE IF NOT EXISTS public.user_server_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voting_site_id uuid NOT NULL REFERENCES public.server_voting_sites(id) ON DELETE CASCADE,
  last_voted_at timestamptz NOT NULL DEFAULT now(),
  total_votes integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, voting_site_id)
);

-- Server voting rewards table
CREATE TABLE IF NOT EXISTS public.voting_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  item_commands text[], -- Array of commands to give items
  votes_required integer DEFAULT 1,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User voting statistics table
CREATE TABLE IF NOT EXISTS public.user_voting_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_votes integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_vote_date date,
  total_rewards_claimed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.server_voting_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_server_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_voting_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for server_voting_sites
DROP POLICY IF EXISTS "Anyone can view voting sites" ON public.server_voting_sites;
CREATE POLICY "Anyone can view voting sites"
ON public.server_voting_sites
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage voting sites" ON public.server_voting_sites;
CREATE POLICY "Admins can manage voting sites"
ON public.server_voting_sites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

-- RLS Policies for user_server_votes
DROP POLICY IF EXISTS "Users can view own votes" ON public.user_server_votes;
CREATE POLICY "Users can view own votes"
ON public.user_server_votes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own votes" ON public.user_server_votes;
CREATE POLICY "Users can manage own votes"
ON public.user_server_votes
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for voting_rewards
DROP POLICY IF EXISTS "Anyone can view rewards" ON public.voting_rewards;
CREATE POLICY "Anyone can view rewards"
ON public.voting_rewards
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage rewards" ON public.voting_rewards;
CREATE POLICY "Admins can manage rewards"
ON public.voting_rewards
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('owner', 'system_admin', 'senior_admin', 'admin')
  )
);

-- RLS Policies for user_voting_stats
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_voting_stats;
CREATE POLICY "Users can view own stats"
ON public.user_voting_stats
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_voting_stats;
CREATE POLICY "Users can update own stats"
ON public.user_voting_stats
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_server_voting_sites_active ON public.server_voting_sites(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_user_server_votes_user_id ON public.user_server_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_server_votes_last_voted ON public.user_server_votes(last_voted_at);
CREATE INDEX IF NOT EXISTS idx_voting_rewards_active ON public.voting_rewards(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_user_voting_stats_user_id ON public.user_voting_stats(user_id);

-- Function to update voting statistics
CREATE OR REPLACE FUNCTION public.update_voting_stats()
RETURNS TRIGGER AS $$
DECLARE
  previous_vote_date date;
  current_vote_date date;
BEGIN
  current_vote_date := NEW.last_voted_at::date;
  
  -- Get previous vote date for streak calculation
  SELECT last_vote_date INTO previous_vote_date 
  FROM public.user_voting_stats 
  WHERE user_id = NEW.user_id;
  
  -- Insert or update user voting stats
  INSERT INTO public.user_voting_stats (
    user_id, 
    total_votes, 
    current_streak, 
    longest_streak,
    last_vote_date
  ) VALUES (
    NEW.user_id,
    1,
    1,
    1,
    current_vote_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_votes = user_voting_stats.total_votes + 1,
    current_streak = CASE
      WHEN previous_vote_date = current_vote_date - INTERVAL '1 day' THEN user_voting_stats.current_streak + 1
      WHEN previous_vote_date = current_vote_date THEN user_voting_stats.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      user_voting_stats.longest_streak,
      CASE
        WHEN previous_vote_date = current_vote_date - INTERVAL '1 day' THEN user_voting_stats.current_streak + 1
        WHEN previous_vote_date = current_vote_date THEN user_voting_stats.current_streak
        ELSE 1
      END
    ),
    last_vote_date = current_vote_date,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for voting stats
DROP TRIGGER IF EXISTS trigger_update_voting_stats ON public.user_server_votes;
CREATE TRIGGER trigger_update_voting_stats
  AFTER INSERT OR UPDATE ON public.user_server_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_voting_stats();

-- Insert default voting sites
INSERT INTO public.server_voting_sites (name, description, voting_url, reward_description, display_order) VALUES
('Minecraft-Server-List.com', 'Vote for our server on Minecraft Server List', 'https://minecraft-server-list.com/server/example', 'Receive 64 diamonds and $1000 in-game currency', 1),
('TopMinecraftServers.org', 'Help us climb the rankings on Top Minecraft Servers', 'https://topminecraftservers.org/server/example', 'Get a rare enchanted sword and 32 emeralds', 2),
('MinecraftServers.org', 'Show your support on Minecraft Servers', 'https://minecraftservers.org/server/example', 'Earn voting keys and special rank perks', 3),
('Minecraft-MP.com', 'Vote daily on Minecraft Multiplayer', 'https://minecraft-mp.com/server/example', 'Unlock exclusive cosmetic items and boosts', 4),
('PlanetMinecraft.com', 'Support us on Planet Minecraft', 'https://planetminecraft.com/server/example', 'Receive monthly voting rewards and VIP status', 5)
ON CONFLICT DO NOTHING;

-- Insert default voting rewards
INSERT INTO public.voting_rewards (name, description, votes_required, item_commands, display_order) VALUES
('Daily Voter', 'Vote once per day', 1, ARRAY['/give {player} diamond 8', '/eco give {player} 500'], 1),
('Weekly Warrior', 'Vote 7 times in a week', 7, ARRAY['/give {player} diamond_sword 1', '/give {player} emerald 16'], 2),
('Monthly Champion', 'Vote 30 times in a month', 30, ARRAY['/give {player} netherite_ingot 4', '/eco give {player} 5000', '/lp user {player} permission set vote.vip true'], 3),
('Voting Streak 10', 'Maintain a 10-day voting streak', 10, ARRAY['/give {player} elytra 1', '/give {player} firework_rocket 64'], 4),
('Ultimate Supporter', 'Vote 100 times total', 100, ARRAY['/give {player} dragon_head 1', '/eco give {player} 25000', '/lp user {player} parent add vip'], 5)
ON CONFLICT DO NOTHING;
