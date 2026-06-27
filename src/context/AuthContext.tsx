'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  role: string;
  [key: string]: any;
}

// Compat user type that bridges Firebase's User API to Supabase's User API
// This way, existing code using user.uid, user.displayName, user.photoURL, user.getIdToken()
// continues to work without changes.
interface CompatUser {
  // Supabase native properties
  id: string;
  email?: string | null;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
  created_at: string;
  
  // Firebase compat properties
  uid: string;  // alias for id
  displayName: string | null;  // from user_metadata.full_name
  photoURL: string | null;  // from user_metadata.avatar_url
  phoneNumber: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerData: any[];
  refreshToken: string;
  tenantId: string | null;
  
  // Firebase compat methods
  getIdToken: () => Promise<string>;
  toJSON: () => Record<string, any>;
  delete: () => Promise<void>;
  
  // Allow any other properties
  [key: string]: any;
}

function createCompatUser(supabaseUser: SupabaseUser): CompatUser {
  return {
    // Native Supabase properties
    id: supabaseUser.id,
    email: supabaseUser.email,
    app_metadata: supabaseUser.app_metadata,
    user_metadata: supabaseUser.user_metadata,
    aud: supabaseUser.aud,
    created_at: supabaseUser.created_at,
    
    // Firebase compat
    uid: supabaseUser.id,
    displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
    photoURL: supabaseUser.user_metadata?.avatar_url || null,
    phoneNumber: supabaseUser.user_metadata?.phone || null,
    emailVerified: supabaseUser.email_confirmed_at != null,
    isAnonymous: false,
    providerData: [],
    refreshToken: supabaseUser.refresh_token || '',
    tenantId: null,
    
    // Firebase compat methods
    async getIdToken() {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    },
    toJSON() {
      return { ...supabaseUser };
    },
    async delete() {
      throw new Error('User deletion should be done via Supabase Admin API');
    },
  };
}

interface AuthContextType {
  user: CompatUser | null;
  loading: boolean;
  role: string | null;
  userProfile: UserProfile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CompatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const compatUser = createCompatUser(session.user);
        setUser(compatUser);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const compatUser = createCompatUser(session.user);
          setUser(compatUser);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Realtime subscription for user profile changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const profileData = payload.new as UserProfile;
          profileData.plan = 'pro'; // TEMP: unlock all premium features
          setRole(profileData.role);
          setUserProfile(profileData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchUserProfile(uid: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setRole(null);
        setUserProfile(null);
      } else if (data) {
        const profileData = data as UserProfile;
        profileData.plan = 'pro'; // TEMP: unlock all premium features
        setRole(profileData.role);
        setUserProfile(profileData);
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, role, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
