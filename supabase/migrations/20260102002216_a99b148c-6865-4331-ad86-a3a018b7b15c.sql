-- Add app_mode column to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN app_mode TEXT DEFAULT NULL;
-- Values: 'simple' | 'extended' | NULL (not chosen yet)