import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type TeamMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type TeamMembersResult = {
  members: TeamMember[];
  canCreateAccounts: boolean;
};

type AdminSupabase = Awaited<ReturnType<typeof createClient>>;

function parseTeamRow(raw: unknown): TeamMember | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.role !== "string") return null;

  return {
    id: row.id,
    email: typeof row.email === "string" ? row.email : null,
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    role: row.role as UserRole,
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
  };
}

function normalizeTeamRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Staff list via admin RPC (emails from auth.users, no service_role). */
export async function getTeamMembers(
  supabase: AdminSupabase,
  canCreateAccounts: boolean,
): Promise<TeamMembersResult> {
  const { data, error } = await supabase.rpc("admin_list_team");

  if (error) throw new Error(error.message);

  const members = normalizeTeamRows(data)
    .map(parseTeamRow)
    .filter((member): member is TeamMember => member != null);

  return { members, canCreateAccounts };
}
