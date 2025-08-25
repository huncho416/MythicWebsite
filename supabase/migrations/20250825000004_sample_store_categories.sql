-- Create sample store categories if none exist
INSERT INTO public.store_categories (name, description, slug, color, icon, is_active, sort_order, created_at, updated_at)
VALUES 
  ('VIP Ranks', 'Premium rank packages with exclusive perks', 'vip-ranks', '#8B5CF6', 'crown', true, 1, now(), now()),
  ('Crate Keys', 'Unlock amazing rewards with our crate keys', 'crate-keys', '#F59E0B', 'key', true, 2, now(), now()),
  ('Cosmetics', 'Unique cosmetic items and effects', 'cosmetics', '#EC4899', 'sparkles', true, 3, now(), now()),
  ('Boosters', 'Temporary game boosters and enhancements', 'boosters', '#10B981', 'zap', true, 4, now(), now())
ON CONFLICT (slug) DO NOTHING;
