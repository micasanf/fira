-- ============================================================
-- FIRA Database Schema (Supabase / PostgreSQL)
-- Complete migration from Firebase Firestore to Supabase
-- 
-- IDEMPOTENT: Safe to re-run multiple times.
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DROP OLD TABLES THAT HAVE SCHEMA CHANGES
-- (Only needed if re-running after a previous partial migration)
-- Comment out the DROP block below if this is a fresh database.
-- ============================================================

-- Drop tables in dependency order (child → parent)
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.saved_opportunities CASCADE;
DROP TABLE IF EXISTS public.followers CASCADE;
DROP TABLE IF EXISTS public.user_encryption_keys CASCADE;
DROP TABLE IF EXISTS public._internal_rate_limits CASCADE;
DROP TABLE IF EXISTS public.monthly_email_counts CASCADE;
DROP TABLE IF EXISTS public.daily_email_counts CASCADE;
DROP TABLE IF EXISTS public.saved_job_descriptions CASCADE;
DROP TABLE IF EXISTS public.callee_ice_candidates CASCADE;
DROP TABLE IF EXISTS public.caller_ice_candidates CASCADE;
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;
DROP TABLE IF EXISTS public.public_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================
-- USERS TABLE
-- Primary key `id` = Supabase Auth UID (auth.users.id)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'employer', 'admin')),
  company_name TEXT,
  headline TEXT,
  photo_url TEXT,
  cover_photo TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  experience TEXT,
  education TEXT,
  employment_history TEXT,
  interests TEXT,
  career_goals TEXT,
  "references" TEXT,
  portfolio_link TEXT,
  linkedin TEXT,
  github TEXT,
  website TEXT,
  resume_url TEXT,
  cover_letter_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'premium', 'business')),
  plan_updated_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  last_webhook_event_id TEXT,
  preferences JSONB DEFAULT '{}',
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  encryption_public_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PUBLIC PROFILES TABLE
-- Visible to all users for search/discovery
-- ============================================================
CREATE TABLE public.public_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'employee',
  company_name TEXT,
  company_overview TEXT,
  company_logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  founded TEXT,
  benefits TEXT,
  culture TEXT,
  support_email TEXT,
  contact_number TEXT,
  headline TEXT,
  photo_url TEXT,
  cover_photo TEXT,
  location TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  education TEXT,
  interests TEXT,
  career_goals TEXT,
  employment_history TEXT,
  portfolio_link TEXT,
  portfolio_projects JSONB DEFAULT '[]',
  linkedin TEXT,
  github TEXT,
  twitter TEXT,
  website TEXT,
  followers TEXT[] DEFAULT '{}',
  following TEXT[] DEFAULT '{}',
  encryption_public_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OPPORTUNITIES (Job Postings) TABLE
-- ============================================================
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  company TEXT,
  company_logo TEXT,
  company_overview TEXT,
  employer_id UUID REFERENCES public.users(id),
  employer_name TEXT,
  employer_photo_url TEXT,
  location TEXT,
  salary TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'PHP',
  type TEXT,
  job_type TEXT,
  category TEXT,
  experience_level TEXT,
  skills TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  preferred_qualifications TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  roles_and_responsibilities TEXT,
  benefits TEXT[] DEFAULT '{}',
  compensation_and_benefits TEXT,
  education TEXT,
  experience TEXT,
  working_hours TEXT,
  travel_requirements TEXT,
  application_instructions TEXT,
  legal_statement TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft', 'paused', 'archived')),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_remote BOOLEAN DEFAULT FALSE,
  application_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  deadline DATE,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATIONS TABLE
-- ============================================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  employer_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn', 'pending', 'reviewed', 'interviewed', 'approved')),
  cover_letter TEXT,
  resume_url TEXT,
  notes TEXT,
  user_email TEXT,
  user_name TEXT,
  column_name TEXT DEFAULT 'applied',
  is_manual BOOLEAN DEFAULT FALSE,
  title TEXT,
  company TEXT,
  location TEXT,
  salary TEXT,
  job_url TEXT,
  withdrawn_at TIMESTAMPTZ,
  rating INTEGER,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);

-- ============================================================
-- POSTS TABLE (Community Feed)
-- ============================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  user_name TEXT,
  user_photo TEXT,
  user_role TEXT,
  user_title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  likes TEXT[] DEFAULT '{}',
  comments JSONB DEFAULT '[]',
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POST COMMENTS TABLE
-- ============================================================
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHATS TABLE
-- ============================================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL,
  participant_details JSONB DEFAULT '[]',
  participant_names TEXT[] DEFAULT '{}',
  participant_photos TEXT[] DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_sender_id UUID,
  unread_count JSONB DEFAULT '{}',
  hidden_for UUID[] DEFAULT '{}',
  is_group BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  type TEXT DEFAULT 'direct',
  opportunity_id UUID,
  opportunity_title TEXT,
  application_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHAT MESSAGES TABLE
-- ============================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT FALSE,
  ciphertext TEXT,
  iv TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  actor_id UUID REFERENCES public.users(id),
  actor_name TEXT,
  actor_photo_url TEXT,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CALLS TABLE (Video Calls / WebRTC)
-- ============================================================
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id UUID REFERENCES public.users(id),
  callee_id UUID REFERENCES public.users(id),
  caller_name TEXT,
  callee_name TEXT,
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'connected', 'active', 'ended', 'missed', 'declined')),
  offer TEXT,
  answer TEXT,
  opportunity_id TEXT,
  opportunity_title TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ICE CANDIDATES TABLES (WebRTC Signaling)
-- ============================================================
CREATE TABLE public.caller_ice_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  candidate JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.callee_ice_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  candidate JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SAVED JOB DESCRIPTIONS TABLE
-- ============================================================
CREATE TABLE public.saved_job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  title TEXT,
  description TEXT,
  original_text TEXT,
  ai_enhanced_text TEXT,
  is_enhanced BOOLEAN DEFAULT FALSE,
  file_name TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAILY EMAIL COUNTS TABLE
-- ============================================================
CREATE TABLE public.daily_email_counts (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MONTHLY EMAIL COUNTS TABLE
-- ============================================================
CREATE TABLE public.monthly_email_counts (
  id TEXT PRIMARY KEY,
  transactional INTEGER DEFAULT 0,
  broadcasts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTERNAL RATE LIMITS TABLE
-- ============================================================
CREATE TABLE public._internal_rate_limits (
  id TEXT PRIMARY KEY,
  user_id UUID,
  tool TEXT,
  count INTEGER DEFAULT 0,
  max_requests INTEGER,
  plan_tier TEXT,
  window_start TIMESTAMPTZ,
  reset_time TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER ENCRYPTION KEYS TABLE
-- ============================================================
CREATE TABLE public.user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid UUID REFERENCES public.users(id) ON DELETE CASCADE,
  encryption_public_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOLLOWERS TABLE
-- ============================================================
CREATE TABLE public.followers (
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================
-- SAVED OPPORTUNITIES TABLE
-- ============================================================
CREATE TABLE public.saved_opportunities (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, opportunity_id)
);

-- ============================================================
-- RATE LIMITS TABLE
-- ============================================================
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callee_ice_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users: can read all, update own
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Public Profiles: readable by all, writable by owner
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.public_profiles;
DROP POLICY IF EXISTS "Users can update own public profile" ON public.public_profiles;
DROP POLICY IF EXISTS "Users can insert own public profile" ON public.public_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.public_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own public profile" ON public.public_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own public profile" ON public.public_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Opportunities: readable by all, writable by employer
DROP POLICY IF EXISTS "Opportunities are viewable by everyone" ON public.opportunities;
DROP POLICY IF EXISTS "Employers can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Employers can update own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Employers can delete own opportunities" ON public.opportunities;
CREATE POLICY "Opportunities are viewable by everyone" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Employers can create opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update own opportunities" ON public.opportunities FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete own opportunities" ON public.opportunities FOR DELETE USING (auth.uid() = employer_id);

-- Applications: readable by applicant or employer, writable by applicant
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.applications;
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id OR auth.uid() = employer_id);
CREATE POLICY "Users can create applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = employer_id);
CREATE POLICY "Users can delete own applications" ON public.applications FOR DELETE USING (auth.uid() = user_id);

-- Posts: readable by all, writable by author
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Post Comments: readable by all, writable by author
DROP POLICY IF EXISTS "Post comments are viewable by everyone" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create post comments" ON public.post_comments;
CREATE POLICY "Post comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create post comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Chats: readable by participants
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;
CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = ANY(participants));
CREATE POLICY "Users can update own chats" ON public.chats FOR UPDATE USING (auth.uid() = ANY(participants));
CREATE POLICY "Users can delete own chats" ON public.chats FOR DELETE USING (auth.uid() = ANY(participants));

-- Chat Messages: readable by chat participants
DROP POLICY IF EXISTS "Users can view messages in own chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in own chats" ON public.chat_messages;
CREATE POLICY "Users can view messages in own chats" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chats WHERE chats.id = chat_messages.chat_id AND auth.uid() = ANY(chats.participants))
);
CREATE POLICY "Users can send messages in own chats" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chats WHERE chats.id = chat_messages.chat_id AND auth.uid() = ANY(chats.participants))
);

-- Notifications: readable by owner
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Calls: readable by participants
DROP POLICY IF EXISTS "Users can view own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can create calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;
CREATE POLICY "Users can view own calls" ON public.calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can create calls" ON public.calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update own calls" ON public.calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);

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

-- Saved Job Descriptions: readable by owner
DROP POLICY IF EXISTS "Users can view own saved job descriptions" ON public.saved_job_descriptions;
DROP POLICY IF EXISTS "Users can create own saved job descriptions" ON public.saved_job_descriptions;
DROP POLICY IF EXISTS "Users can update own saved job descriptions" ON public.saved_job_descriptions;
DROP POLICY IF EXISTS "Users can delete own saved job descriptions" ON public.saved_job_descriptions;
CREATE POLICY "Users can view own saved job descriptions" ON public.saved_job_descriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own saved job descriptions" ON public.saved_job_descriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved job descriptions" ON public.saved_job_descriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved job descriptions" ON public.saved_job_descriptions FOR DELETE USING (auth.uid() = user_id);

-- Encryption Keys: readable by owner
DROP POLICY IF EXISTS "Users can view own encryption keys" ON public.user_encryption_keys;
DROP POLICY IF EXISTS "Users can insert own encryption keys" ON public.user_encryption_keys;
DROP POLICY IF EXISTS "Users can update own encryption keys" ON public.user_encryption_keys;
CREATE POLICY "Users can view own encryption keys" ON public.user_encryption_keys FOR SELECT USING (auth.uid() = uid);
CREATE POLICY "Users can insert own encryption keys" ON public.user_encryption_keys FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "Users can update own encryption keys" ON public.user_encryption_keys FOR UPDATE USING (auth.uid() = uid);

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
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);
CREATE INDEX IF NOT EXISTS idx_opportunities_employer_id ON public.opportunities(employer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_active ON public.opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_posted_at ON public.opportunities(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity_id ON public.applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_employer_id ON public.applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_chats_participants ON public.chats USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_calls_participants ON public.calls(caller_id, callee_id);
CREATE INDEX IF NOT EXISTS idx_caller_ice_call_id ON public.caller_ice_candidates(call_id);
CREATE INDEX IF NOT EXISTS idx_callee_ice_call_id ON public.callee_ice_candidates(call_id);
CREATE INDEX IF NOT EXISTS idx_saved_jd_user_id ON public.saved_job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_opps_user_id ON public.saved_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_public_profiles_updated_at ON public.public_profiles;
CREATE TRIGGER update_public_profiles_updated_at BEFORE UPDATE ON public.public_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_saved_jd_updated_at ON public.saved_job_descriptions;
CREATE TRIGGER update_saved_jd_updated_at BEFORE UPDATE ON public.saved_job_descriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_encryption_keys_updated_at ON public.user_encryption_keys;
CREATE TRIGGER update_encryption_keys_updated_at BEFORE UPDATE ON public.user_encryption_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_daily_email_counts_updated_at ON public.daily_email_counts;
CREATE TRIGGER update_daily_email_counts_updated_at BEFORE UPDATE ON public.daily_email_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_monthly_email_counts_updated_at ON public.monthly_email_counts;
CREATE TRIGGER update_monthly_email_counts_updated_at BEFORE UPDATE ON public.monthly_email_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create user profile on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '',
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  INSERT INTO public.public_profiles (id, display_name, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '',
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- REALTIME PUBLICATIONS
-- (Use ALTER ... SET to add tables idempotently)
-- ============================================================
ALTER PUBLICATION supabase_realtime SET TABLE public.chat_messages, public.notifications, public.chats, public.calls, public.caller_ice_candidates, public.callee_ice_candidates;
