"use server";

import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isServiceRoleKeyConfigured } from "@/lib/supabase/env";
import type { UserRole } from "@/types/database";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const STAFF_ROLES = new Set<UserRole>(["admin", "driver"]);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function getCurrentUserId(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return typeof userId === "string" ? userId : null;
}

async function createAuthUser(input: {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
}): Promise<ActionResult> {
  if (!isServiceRoleKeyConfigured()) {
    return {
      ok: false,
      error:
        "Para cuentas nuevas crea el usuario en Supabase → Authentication → Users, luego agrégalo aquí solo con correo y rol.",
    };
  }

  let service;
  try {
    service = createServiceRoleClient();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo usar la service role en el servidor.",
    };
  }

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("invalid api key")) {
      return {
        ok: false,
        error:
          "Supabase rechazó la service role. Crea la cuenta en Authentication → Users y agrégala aquí con correo y rol.",
      };
    }
    return { ok: false, error: createError.message };
  }

  const userId = created.user?.id;
  if (!userId) {
    return { ok: false, error: "No se pudo crear la cuenta." };
  }

  const { error: profileError } = await service.from("profiles").upsert(
    {
      id: userId,
      full_name: input.fullName,
      role: input.role,
    },
    { onConflict: "id" },
  );

  if (profileError) return { ok: false, error: profileError.message };
  return { ok: true };
}

export async function updateMemberRole(input: {
  userId: string;
  role: UserRole;
}): Promise<ActionResult> {
  if (!STAFF_ROLES.has(input.role)) {
    return { ok: false, error: "Rol no válido para equipo." };
  }

  const gate = await requireAdminClient();
  if (!gate.ok) return { ok: false, error: gate.error };

  const currentUserId = await getCurrentUserId(gate.supabase);
  if (currentUserId === input.userId && input.role !== "admin") {
    return {
      ok: false,
      error: "No puedes quitarte tu propio rol de administrador.",
    };
  }

  const { data: target, error: fetchError } = await gate.supabase
    .from("profiles")
    .select("id, role")
    .eq("id", input.userId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!target) return { ok: false, error: "Usuario no encontrado." };

  if (target.role === "admin" && input.role !== "admin") {
    const { count, error: countError } = await gate.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: "Debe quedar al menos una administradora en el equipo.",
      };
    }
  }

  const { error } = await gate.supabase
    .from("profiles")
    .update({ role: input.role })
    .eq("id", input.userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function inviteTeamMember(input: {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
}): Promise<ActionResult> {
  if (!STAFF_ROLES.has(input.role)) {
    return { ok: false, error: "Rol no válido para equipo." };
  }

  const email = normalizeEmail(input.email);
  if (!email.includes("@")) {
    return { ok: false, error: "Correo inválido." };
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return { ok: false, error: "Nombre demasiado corto." };
  }

  const gate = await requireAdminClient();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { error: upsertError } = await gate.supabase.rpc(
    "admin_upsert_team_member",
    {
      p_email: email,
      p_full_name: fullName,
      p_role: input.role,
    },
  );

  if (!upsertError) {
    revalidatePath("/admin/team");
    return {
      ok: true,
      message:
        "Rol asignado. Si el correo ya existía, la contraseña no cambió — usa la anterior o resetea en Supabase → Authentication → Users.",
    };
  }

  const notFound =
    upsertError.message.includes("USER_NOT_FOUND") ||
    upsertError.message.toLowerCase().includes("not found");

  if (!notFound) {
    return { ok: false, error: upsertError.message };
  }

  if (input.password.length < 8) {
    return {
      ok: false,
      error:
        "Ese correo no existe aún. Pon una contraseña (8+ caracteres) o créalo primero en Supabase → Authentication → Users.",
    };
  }

  const created = await createAuthUser({
    email,
    fullName,
    password: input.password,
    role: input.role,
  });

  if (!created.ok) return created;

  revalidatePath("/admin/team");
  return {
    ok: true,
    message: "Cuenta creada. Comparte la contraseña inicial con la persona.",
  };
}
