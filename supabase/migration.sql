-- FIRA Supabase Database Schema
-- Migration from Firebase Firestore to Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employer', 'employee')),
  photo_url TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  headline TEXT,
  company_name TEXT,
  company_website TEXT,
  company_description TEXT,
  company_logo_url TEXT,
  company_industry TEXT,
  company_size TEXT,
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('free', 'starter', 'pro', 'premium', 'business')),
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  skills TEXT[] DEFAULT '{}',
  experience TEXT[] DEFAULT '{}',
  education TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  resume_url TEXT,
  cover_letter_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT UNIQUE NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  photo_url TEXT,
  headline TEXT,
  company_name TEXT,
  location TEXT,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OPPORTUNITIES (Jobs)
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship', 'remote')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  category TEXT,
  experience_level TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPLICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  resume_url TEXT,
  notes TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(opportunity_id, applicant_id)
);

-- ============================================
-- CHATS
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants TEXT[] NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POSTS (Community Feed)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  likes TEXT[] DEFAULT '{}',
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALLS (WebRTC)
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  callee_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVED JOB DESCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS saved_job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  salary_range TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RATE LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action)
);

-- ============================================
-- FOLLOWERS
-- ============================================
CREATE TABLE IF NOT EXISTS followers (
  follower_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- ============================================
-- SAVED OPPORTUNITIES
-- ============================================
CREATE TABLE IF NOT EXISTS saved_opportunities (
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, opportunity_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_opportunities_employer ON opportunities(employer_id);
CREATE INDEX idx_opportunities_active ON opportunities(is_active);
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_applications_employer ON applications(employer_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_chats_participants ON chats USING GIN(participants);
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_calls_participants ON calls(caller_id, callee_id);
CREATE INDEX idx_saved_jd_user ON saved_job_descriptions(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users readable" ON users FOR SELECT USING (true);
CREATE POLICY "Users insert own" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid()::text = uid);

-- Public profiles policies
CREATE POLICY "Public profiles readable" ON public_profiles FOR SELECT USING (true);
CREATE POLICY "Insert public profile" ON public_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own public profile" ON public_profiles FOR UPDATE USING (auth.uid()::text = uid);

-- Opportunities policies
CREATE POLICY "Opportunities readable" ON opportunities FOR SELECT USING (true);
CREATE POLICY "Create opportunities" ON opportunities FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own opportunities" ON opportunities FOR UPDATE USING (employer_id = auth.uid()::text);

-- Applications policies
CREATE POLICY "Read relevant applications" ON applications FOR SELECT USING (
  applicant_id = auth.uid()::text OR employer_id = auth.uid()::text
);
CREATE POLICY "Create applications" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update relevant applications" ON applications FOR UPDATE USING (
  employer_id = auth.uid()::text OR applicant_id = auth.uid()::text
);

-- Chats policies
CREATE POLICY "Read own chats" ON chats FOR SELECT USING (participants @> ARRAY[auth.uid()::text]);
CREATE POLICY "Create chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own chats" ON chats FOR UPDATE USING (participants @> ARRAY[auth.uid()::text]);

-- Chat messages policies
CREATE POLICY "Read messages in own chats" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_messages.chat_id AND chats.participants @> ARRAY[auth.uid()::text])
);
CREATE POLICY "Send messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid()::text);

-- Posts policies
CREATE POLICY "Posts readable" ON posts FOR SELECT USING (true);
CREATE POLICY "Create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own posts" ON posts FOR UPDATE USING (author_id = auth.uid()::text);

-- Comments policies
CREATE POLICY "Comments readable" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Create comments" ON post_comments FOR INSERT WITH CHECK (true);

-- Calls policies
CREATE POLICY "Read own calls" ON calls FOR SELECT USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);
CREATE POLICY "Create calls" ON calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own calls" ON calls FOR UPDATE USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);

-- Saved JDs policies
CREATE POLICY "Read own saved JDs" ON saved_job_descriptions FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Create saved JDs" ON saved_job_descriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Delete own saved JDs" ON saved_job_descriptions FOR DELETE USING (user_id = auth.uid()::text);

-- Saved opportunities policies
CREATE POLICY "Read own saved opps" ON saved_opportunities FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Save opportunities" ON saved_opportunities FOR INSERT WITH CHECK (true);
CREATE POLICY "Unsave opportunities" ON saved_opportunities FOR DELETE USING (user_id = auth.uid()::text);

-- Followers policies
CREATE POLICY "Followers readable" ON followers FOR SELECT USING (true);
CREATE POLICY "Create follows" ON followers FOR INSERT WITH CHECK (true);
CREATE POLICY "Delete own follows" ON followers FOR DELETE USING (follower_id = auth.uid()::text);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
