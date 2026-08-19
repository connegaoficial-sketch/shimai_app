"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  inviteTeamMember,
  updateMemberRole,
} from "@/app/(admin)/admin/(panel)/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "@/lib/admin/team-members";
import type { UserRole } from "@/types/database";

type TeamAdminProps = {
  members: TeamMember[];
  currentUserId: string;
  canCreateAccounts: boolean;
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  driver: "Repartidor",
  client: "Cliente",
};

const selectClassName =
  "h-10 rounded-md border border-shimai-ivory/15 bg-shimai-surface px-3 font-sans text-sm text-shimai-ivory";

export function TeamAdmin({
  members,
  currentUserId,
  canCreateAccounts,
}: TeamAdminProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("driver");
  const [password, setPassword] = useState("");

  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>(() =>
    Object.fromEntries(members.map((member) => [member.id, member.role])),
  );

  function invite() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await inviteTeamMember({
        email,
        fullName,
        role: inviteRole,
        password,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      setFullName("");
      setPassword("");
      setMessage(result.message ?? "Miembro agregado al equipo.");
      router.refresh();
    });
  }

  function saveRole(userId: string) {
    const role = roleDrafts[userId];
    if (!role || role === "client") return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemberRole({ userId, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Rol actualizado.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-shimai-ivory">Equipo</h1>
        <p className="mt-2 font-sans text-sm text-shimai-ivory/55">
          Administra quién puede entrar al panel de cocina y quién reparte
          pedidos.
        </p>
      </div>

      <section className="rounded-md border border-white/[0.08] bg-shimai-surface/40 p-5">
        <h2 className="font-serif text-xl text-shimai-ivory">
          Agregar miembro
        </h2>
        {!canCreateAccounts ? (
          <p className="mt-3 rounded-md border border-shimai-gold/30 bg-shimai-gold/10 px-3 py-3 font-sans text-sm text-shimai-gold">
            Puedes asignar roles a correos que ya existan en SHIMAI. Para
            crear cuentas nuevas desde aquí configura{" "}
            <code className="text-shimai-ivory/80">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            o créalas en Supabase → Authentication → Users.
          </p>
        ) : null}
        <p className="mt-1 font-sans text-sm text-shimai-ivory/50">
          Si el correo <strong className="font-normal text-shimai-gold">ya existía</strong>,
          solo se asigna el rol — la contraseña{" "}
          <strong className="font-normal text-shimai-gold">no se cambia</strong>.
          Para cuentas nuevas, la contraseña debe tener al menos 8 caracteres.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="team-email">Correo</Label>
            <Input
              id="team-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="repartidor@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-name">Nombre</Label>
            <Input
              id="team-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre Apellido"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-role">Rol</Label>
            <select
              id="team-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className={selectClassName}
            >
              <option value="driver">Repartidor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-password">Contraseña inicial</Label>
            <Input
              id="team-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={pending} onClick={invite}>
            Agregar al equipo
          </Button>
          <p className="font-sans text-xs text-shimai-ivory/40">
            Contraseña solo si el correo aún no está registrado.
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-md border border-white/[0.08]">
        <table className="min-w-full border-collapse text-left font-sans text-sm">
          <thead className="bg-shimai-surface/80 text-[11px] uppercase tracking-[0.12em] text-shimai-ivory/50">
            <tr>
              <th className="px-3 py-3 font-medium">Nombre</th>
              <th className="px-3 py-3 font-medium">Correo</th>
              <th className="px-3 py-3 font-medium">Rol</th>
              <th className="px-3 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-shimai-ivory/45"
                >
                  Aún no hay administradores ni repartidores registrados.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const draftRole = roleDrafts[member.id] ?? member.role;
                const dirty = draftRole !== member.role;
                const isSelf = member.id === currentUserId;

                return (
                  <tr
                    key={member.id}
                    className="border-t border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 text-shimai-ivory">
                      {member.full_name?.trim() || "—"}
                      {isSelf ? (
                        <span className="ml-2 font-sans text-[10px] uppercase tracking-[0.12em] text-shimai-gold">
                          Tú
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-shimai-ivory/70">
                      {member.email ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={draftRole}
                        onChange={(e) =>
                          setRoleDrafts((prev) => ({
                            ...prev,
                            [member.id]: e.target.value as UserRole,
                          }))
                        }
                        className={selectClassName}
                        disabled={isSelf}
                      >
                        <option value="admin">Administrador</option>
                        <option value="driver">Repartidor</option>
                      </select>
                      {isSelf ? (
                        <p className="mt-1 font-sans text-[11px] text-shimai-ivory/40">
                          {ROLE_LABELS.admin}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending || !dirty || isSelf}
                        onClick={() => saveRole(member.id)}
                      >
                        Guardar
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {message ? (
        <p className="font-sans text-sm text-shimai-gold" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="font-sans text-sm text-seal-red" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
