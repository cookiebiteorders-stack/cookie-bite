/**
 * Authorization helpers for requiring specific authentication levels
 */

import { auth } from "./supabase-auth";
import { AuthorizationError } from "./errors";

/**
 * Require user to be authenticated
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }
  return { userId };
}

/**
 * Require user to have admin role
 */
export async function requireAdminAuth(): Promise<{ userId: string; role: string }> {
  const { userId, user } = await auth();
  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }
  
  const role = user?.user_metadata?.role || user?.app_metadata?.role;
  if (!["owner", "admin"].includes(role as string)) {
    throw new AuthorizationError("Admin access required");
  }
  
  return { userId, role: role as string };
}

/**
 * Require user to have staff role (owner, admin, or staff)
 */
export async function requireStaffAuth(): Promise<{ userId: string; role: string }> {
  const { userId, user } = await auth();
  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }
  
  const role = user?.user_metadata?.role || user?.app_metadata?.role;
  if (!["owner", "admin", "staff"].includes(role as string)) {
    throw new AuthorizationError("Staff access required");
  }
  
  return { userId, role: role as string };
}
