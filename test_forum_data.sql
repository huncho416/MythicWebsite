-- Add some test forum data for development

-- Insert sample user profiles (you may need to adjust UUIDs based on your auth.users)
-- Note: Run this only after you have some users in your auth.users table

-- Add sample forum categories if they don't exist
INSERT INTO public.forum_categories (name, description, icon, color, category_type, sort_order) VALUES
('General Discussion', 'General server discussions', '💬', '#3B82F6', 'general', 1),
('Announcements', 'Official server announcements', '📢', '#EF4444', 'announcements', 0),
('Support', 'Get help with server issues', '🛠️', '#F59E0B', 'support', 2),
('Suggestions', 'Suggest new features and improvements', '💡', '#10B981', 'suggestions', 3)
ON CONFLICT (name) DO NOTHING;

-- Add some sample threads and posts
-- Note: You'll need to replace the author_id with actual user IDs from your auth.users table
-- This is just a template - you should populate with real data once users exist
