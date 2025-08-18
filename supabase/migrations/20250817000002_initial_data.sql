-- Initial Data Setup
-- This file seeds the database with initial data

-- Insert default site settings
INSERT INTO public.site_settings (key, value, description, category, is_public) VALUES
('site_name', '"MythicPvP"', 'Name of the website', 'general', true),
('site_description', '"The ultimate Minecraft PvP experience"', 'Site description', 'general', true),
('maintenance_mode', 'false', 'Enable maintenance mode', 'general', false),
('discord_invite', '"https://discord.gg/CkgBWH4CRZ"', 'Discord server invite link', 'social', true),
('store_currency', '"$"', 'Store currency symbol', 'store', true),
('paypal_enabled', 'true', 'Enable PayPal payments', 'payments', false),
('stripe_enabled', 'false', 'Enable Stripe payments', 'payments', false),
('max_tickets_per_user', '5', 'Maximum open tickets per user', 'support', false),
('forum_posts_per_page', '10', 'Forum posts per page', 'forum', true),
('auto_close_tickets_days', '7', 'Auto-close resolved tickets after X days', 'support', false)
ON CONFLICT (key) DO NOTHING;

-- Insert default forum categories
INSERT INTO public.forum_categories (name, description, slug, icon, color, sort_order, category_type) VALUES
('📢 Announcements', 'Official server announcements and updates', 'announcements', '📢', '#ef4444', 1, 'announcements'),
('💬 General Discussion', 'General chat and discussions', 'general', '💬', '#6366f1', 2, 'general'),
('❓ Support & Help', 'Get help with server issues', 'support', '❓', '#eab308', 3, 'support'),
('💡 Suggestions', 'Suggest new features and improvements', 'suggestions', '💡', '#10b981', 4, 'suggestions'),
('🎮 Off Topic', 'Non-server related discussions', 'off-topic', '🎮', '#8b5cf6', 5, 'off_topic')
ON CONFLICT (slug) DO NOTHING;

-- Insert default store categories
INSERT INTO public.store_categories (name, description, slug, icon, color, sort_order, is_featured) VALUES
('⚔️ Ranks', 'Server ranks with exclusive perks', 'ranks', '⚔️', '#ef4444', 1, true),
('🎁 Crates', 'Mystery crates with random rewards', 'crates', '🎁', '#f59e0b', 2, true),
('🔥 Kits', 'Pre-made item kits for PvP', 'kits', '🔥', '#dc2626', 3, false),
('💎 Cosmetics', 'Cosmetic items and effects', 'cosmetics', '💎', '#8b5cf6', 4, false),
('🏠 Claims', 'Land protection and claims', 'claims', '🏠', '#059669', 5, false),
('⚡ Boosters', 'Temporary server boosters', 'boosters', '⚡', '#0ea5e9', 6, false)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample store packages
INSERT INTO public.store_packages (
  category_id, 
  name, 
  description, 
  short_description, 
  price, 
  package_type, 
  is_featured, 
  sort_order,
  commands,
  items
) VALUES
(
  (SELECT id FROM public.store_categories WHERE slug = 'ranks' LIMIT 1),
  'VIP Rank',
  'Get access to exclusive VIP perks including priority queue, special chat colors, and more!',
  'Basic VIP rank with essential perks',
  9.99,
  'one_time',
  true,
  1,
  ARRAY['lp user {player} parent set vip', 'bc &6{player} &7just purchased &6VIP &7rank!'],
  '{"items": [{"name": "VIP Kit", "description": "Monthly VIP kit with exclusive items"}], "perks": ["Priority Queue", "Colored Chat", "VIP Kit", "/heal command"]}'::jsonb
),
(
  (SELECT id FROM public.store_categories WHERE slug = 'ranks' LIMIT 1),
  'MVP Rank',
  'Premium rank with advanced perks, cosmetics, and special abilities!',
  'Premium rank with advanced features',
  19.99,
  'one_time',
  true,
  2,
  ARRAY['lp user {player} parent set mvp', 'bc &b{player} &7just purchased &bMVP &7rank!'],
  '{"items": [{"name": "MVP Kit", "description": "Monthly MVP kit with rare items"}], "perks": ["All VIP Perks", "Flying in Lobby", "MVP Kit", "/fix command", "Particle Effects"]}'::jsonb
),
(
  (SELECT id FROM public.store_categories WHERE slug = 'crates' LIMIT 1),
  'Legendary Crate',
  'Open for a chance to get legendary items, rare cosmetics, and exclusive rewards!',
  'Premium crate with legendary rewards',
  4.99,
  'one_time',
  false,
  1,
  ARRAY['crates give {player} legendary 1', 'bc &6{player} &7just purchased a &6Legendary Crate&7!'],
  '{"possible_rewards": ["Legendary Weapons", "Rare Armor", "Cosmetic Items", "In-game Currency"], "legendary_chance": "15%"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insert sample discount codes
INSERT INTO public.discounts (
  code,
  name,
  description,
  discount_type,
  discount_value,
  min_purchase_amount,
  max_uses,
  is_active,
  expires_at
) VALUES
(
  'WELCOME10',
  'Welcome Discount',
  '10% off for new players',
  'percentage',
  10.00,
  5.00,
  100,
  true,
  now() + interval '30 days'
),
(
  'SUMMER25',
  'Summer Sale',
  '$25 off orders over $100',
  'fixed_amount',
  25.00,
  100.00,
  50,
  true,
  now() + interval '60 days'
)
ON CONFLICT (code) DO NOTHING;
