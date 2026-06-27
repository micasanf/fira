/**
 * Session & Authentication Validation Utilities
 * Provides utilities for validating user sessions and protecting routes
 * Migrated from Firebase Auth to Supabase Auth
 */

import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ===========================
// SESSION VALIDATION
// ===========================

/**
 * Validate that a user session is still valid
 */
export async function validateSession(): Promise<{
  valid: boolean;
  user: User | null;
  error?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      return { valid: false, user: null, error: "No active session" };
    }
    
    return { valid: true, user: session.user };
  } catch (error: any) {
    console.error("Session validation failed:", error);
    return { 
      valid: false, 
      user: null, 
      error: "Session expired. Please log in again." 
    };
  }
}

/**
 * Get current user's access token for API requests
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    return session.access_token;
  } catch {
    return null;
  }
}

/**
 * Check if user session is about to expire
 * Returns minutes until expiry
 */
export async function getSessionTimeRemaining(): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;
    
    const expiresAt = session.expires_at;
    if (!expiresAt) return 0;
    
    const expirationTime = expiresAt * 1000; // Convert from seconds to ms
    const now = Date.now();
    
    return Math.max(0, Math.floor((expirationTime - now) / 1000 / 60));
  } catch {
    return 0;
  }
}

/**
 * Setup session monitoring
 * Calls callback when session state changes
 */
export function monitorSession(
  onSessionChange: (user: User | null) => void,
  onSessionExpired?: () => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        onSessionChange(session.user);
      } else {
        onSessionChange(null);
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          onSessionExpired?.();
        }
      }
    }
  );
  
  return () => subscription.unsubscribe();
}

// ===========================
// PROTECTED API HELPER
// ===========================

/**
 * Helper for making authenticated API requests
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Not authenticated");
  }
  
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  
  return fetch(url, {
    ...options,
    headers,
  });
}

// ===========================
// SESSION TIMEOUT HANDLING
// ===========================

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
let inactivityTimer: NodeJS.Timeout | null = null;

/**
 * Start inactivity timeout for session
 */
export function startInactivityTimer(onTimeout: () => void): void {
  resetInactivityTimer(onTimeout);
  
  // Reset timer on user activity
  const events = ["mousedown", "keydown", "scroll", "touchstart"];
  events.forEach((event) => {
    if (typeof window !== "undefined") {
      window.addEventListener(event, () => resetInactivityTimer(onTimeout));
    }
  });
}

/**
 * Reset the inactivity timer
 */
function resetInactivityTimer(onTimeout: () => void): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  inactivityTimer = setTimeout(() => {
    onTimeout();
  }, SESSION_TIMEOUT_MS);
}

/**
 * Stop the inactivity timer
 */
export function stopInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}
