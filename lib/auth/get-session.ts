/**
 * @deprecated Use `lib/supabase/server.ts` directly instead.
 * This shim keeps backward-compat during the Supabase migration.
 */
import { getUser, requireUser } from "@/lib/supabase/server";

export { getUser as getSession, requireUser as requireAuth };
