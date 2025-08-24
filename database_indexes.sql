-- Performance Database Indexes for MythicWebsite
-- Run these commands in your Supabase SQL editor

-- Index for username search with trigram matching for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_username_trgm 
ON user_profiles USING gin(username gin_trgm_ops);

-- Index for forum threads ordering by creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_threads_created_at 
ON forum_threads(created_at DESC);

-- Index for forum posts ordering by creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_created_at 
ON forum_posts(created_at DESC);

-- Index for forum posts by thread
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_thread_id 
ON forum_posts(thread_id);

-- Index for orders status and creation date for admin panel
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created 
ON orders(status, created_at DESC) WHERE status IS NOT NULL;

-- Index for user roles for authorization checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id 
ON user_roles(user_id);

-- Index for user profiles by user_id for faster lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id 
ON user_profiles(user_id);

-- Enable trigram extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for forum categories for faster category listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_categories_name 
ON forum_categories(name);

-- Index for home messages ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_home_messages_created_at 
ON home_messages(created_at DESC);

-- Composite index for forum threads by category and creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_threads_category_created 
ON forum_threads(category_id, created_at DESC);
