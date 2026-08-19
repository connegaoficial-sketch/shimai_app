import { TeamAdmin } from "@/components/admin/TeamAdmin";
import { getTeamMembers } from "@/lib/admin/team-members";
import { isServiceRoleKeyConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims?.sub;
  if (typeof currentUserId !== "string") {
    throw new Error("Sesión inválida.");
  }

  const { members, canCreateAccounts } = await getTeamMembers(
    supabase,
    isServiceRoleKeyConfigured(),
  );

  return (
    <TeamAdmin
      members={members}
      currentUserId={currentUserId}
      canCreateAccounts={canCreateAccounts}
    />
  );
}