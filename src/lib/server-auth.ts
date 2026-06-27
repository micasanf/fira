import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";

export interface ServerAuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  profile: Record<string, any> | null;
  role?: string;
}

export async function getServerAuthenticatedUser(): Promise<ServerAuthenticatedUser> {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Fetch profile from users table
  const { data: profile } = await adminClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    uid: user.id,
    email: user.email,
    emailVerified: user.email_confirmed_at ? true : false,
    profile: profile as Record<string, any> | null,
    role: profile?.role,
  };
}

export async function requireServerAuthenticatedUser(): Promise<ServerAuthenticatedUser> {
  return getServerAuthenticatedUser();
}

export async function requireServerRole(
  roles: string | string[]
): Promise<ServerAuthenticatedUser> {
  const user = await getServerAuthenticatedUser();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return user;
}
