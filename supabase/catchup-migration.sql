-- ============================================================
-- FIRA Catch-up Migration: Create Missing Tables
-- This script creates the 6 tables that were not created
-- due to the "references" reserved keyword bug on line 64.
-- Run this in the Supabase Dashboard SQL Editor.
-- ============================================================

-- 1. Post Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Caller ICE Candidates (WebRTC Signaling)
CREATE TABLE IF NOT EXISTS public.caller_ice_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  candidate JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Callee ICE Candidates (WebRTC Signaling)
CREATE TABLE IF NOT EXISTS public.callee_ice_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  candidate JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Followers
CREATE TABLE IF NOT EXISTS public.followers (
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 5. Saved Opportunities
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, opportunity_id)
);

-- 6. Rate Limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action)
);

-- ============================================================
-- RLS for the new tables
-- ============================================================

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callee_ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Post Comments: readable by all, writable by author
DROP POLICY IF EXISTS "Post comments are viewable by everyone" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create post comments" ON public.post_comments;
CREATE POLICY "Post comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create post comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- ICE Candidates: readable by call participants
DROP POLICY IF EXISTS "Users can view caller ice candidates" ON public.caller_ice_candidates;
DROP POLICY IF EXISTS "Users can insert caller ice candidates" ON public.caller_ice_candidates;
DROP POLICY IF EXISTS "Users can view callee ice candidates" ON public.callee_ice_candidates;
DROP POLICY IF EXISTS "Users can insert callee ice candidates" ON public.callee_ice_candidates;
CREATE POLICY "Users can view caller ice candidates" ON public.caller_ice_candidates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.calls WHERE calls.id = caller_ice_candidates.call_id AND (auth.uid() = calls.caller_id OR auth.uid() = calls.callee_id))
);
CREATE POLICY "Users can insert caller ice candidates" ON public.caller_ice_candidates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.calls WHERE calls.id = caller_ice_candidates.call_id AND auth.uid() = calls.caller_id)
);
CREATE POLICY "Users can view callee ice candidates" ON public.callee_ice_candidates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.calls WHERE calls.id = callee_ice_candidates.call_id AND (auth.uid() = calls.caller_id OR auth.uid() = calls.callee_id))
);
CREATE POLICY "Users can insert callee ice candidates" ON public.callee_ice_candidates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.calls WHERE calls.id = callee_ice_candidates.call_id AND auth.uid() = calls.callee_id)
);

-- Followers: readable by all, follow/unfollow own
DROP POLICY IF EXISTS "Followers are viewable by everyone" ON public.followers;
DROP POLICY IF EXISTS "Users can follow" ON public.followers;
DROP POLICY IF EXISTS "Users can unfollow" ON public.followers;
CREATE POLICY "Followers are viewable by everyone" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- Saved Opportunities: readable by owner
DROP POLICY IF EXISTS "Users can view own saved opportunities" ON public.saved_opportunities;
DROP POLICY IF EXISTS "Users can save opportunities" ON public.saved_opportunities;
DROP POLICY IF EXISTS "Users can unsave opportunities" ON public.saved_opportunities;
CREATE POLICY "Users can view own saved opportunities" ON public.saved_opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save opportunities" ON public.saved_opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave opportunities" ON public.saved_opportunities FOR DELETE USING (auth.uid() = user_id);

-- Rate Limits: allow all (server-side managed)
DROP POLICY IF EXISTS "Rate limits readable" ON public.rate_limits;
DROP POLICY IF EXISTS "Rate limits insertable" ON public.rate_limits;
DROP POLICY IF EXISTS "Rate limits updatable" ON public.rate_limits;
CREATE POLICY "Rate limits readable" ON public.rate_limits FOR SELECT USING (true);
CREATE POLICY "Rate limits insertable" ON public.rate_limits FOR INSERT WITH CHECK (true);
CREATE POLICY "Rate limits updatable" ON public.rate_limits FOR UPDATE USING (true);

-- ============================================================
-- INDEXES for the new tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_caller_ice_call_id ON public.caller_ice_candidates(call_id);
CREATE INDEX IF NOT EXISTS idx_callee_ice_call_id ON public.callee_ice_candidates(call_id);
CREATE INDEX IF NOT EXISTS idx_saved_opps_user_id ON public.saved_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

-- ============================================================
-- REALTIME: Add ICE candidate tables to realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime SET TABLE public.chat_messages, public.notifications, public.chats, public.calls, public.caller_ice_candidates, public.callee_ice_candidates;
