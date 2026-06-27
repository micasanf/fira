/**
 * API Authentication Middleware
 * Validates Supabase JWT tokens for protected API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify Supabase auth token from request
 */
export async function verifyAuthToken(
  request: NextRequest
): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("__supabase-auth-token")?.value;

    // Extract token from "Bearer <token>"
    const token = authHeader
      ? authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader
      : cookieToken;

    if (!token) {
      return {
        authenticated: false,
        error: "No token provided",
      };
    }

    // Verify with Supabase Admin
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        authenticated: false,
        error: "Invalid or expired token",
      };
    }

    return {
      authenticated: true,
      user: {
        uid: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at ? true : false,
      },
    };
  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    return {
      authenticated: false,
      error: "Invalid or expired token",
    };
  }
}

export async function getUserRole(uid: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", uid)
    .single();

  return data?.role ?? null;
}

export async function requireRole(
  request: NextRequest,
  roles: string | string[]
): Promise<{ response: NextResponse | null; user?: AuthenticatedUser; role?: string }> {
  const { response, user } = await requireAuth(request);
  if (response || !user) {
    return { response };
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const role = await getUserRole(user.uid);

  if (!role || !allowedRoles.includes(role)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { response: null, user, role };
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ response: NextResponse | null; user?: AuthenticatedUser }> {
  const result = await verifyAuthToken(request);
  
  if (!result.authenticated) {
    return {
      response: NextResponse.json(
        { error: result.error || "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  
  return { response: null, user: result.user };
}

/**
 * Validate request body against a schema
 */
export function validateBody<T extends Record<string, any>>(
  body: T,
  requiredFields: (keyof T)[],
  fieldValidators?: Partial<Record<keyof T, (value: any) => boolean>>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }
  
  if (fieldValidators) {
    for (const [field, validator] of Object.entries(fieldValidators)) {
      if (body[field] !== undefined && validator && !validator(body[field])) {
        errors.push(`Invalid value for field: ${field}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Common field validators
 */
export const validators = {
  isEmail: (value: string): boolean => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  
  isNonEmptyString: (value: any): boolean => 
    typeof value === "string" && value.trim().length > 0,
  
  isPositiveNumber: (value: any): boolean => 
    typeof value === "number" && value > 0,
  
  isArray: (value: any): boolean => 
    Array.isArray(value),
  
  isNonEmptyArray: (value: any): boolean => 
    Array.isArray(value) && value.length > 0,
  
  maxLength: (max: number) => (value: string): boolean => 
    typeof value === "string" && value.length <= max,
  
  minLength: (min: number) => (value: string): boolean => 
    typeof value === "string" && value.length >= min,
  
  isOneOf: <T>(options: T[]) => (value: T): boolean => 
    options.includes(value),
};

/**
 * Create validation error response
 */
export function validationErrorResponse(errors: string[]): NextResponse {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: errors,
    },
    { status: 400 }
  );
}
