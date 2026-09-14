import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getAllUsers, getFullHierarchy, getService } from "@/lib/queries";
import { UsersTable } from "@/components/domain/UsersTable";

export const metadata: Metadata = { title: "المستخدمون" };

export default async function SettingsUsersPage() {
  const currentUser = await requireUser();
  const [users, stages, service] = await Promise.all([getAllUsers(), getFullHierarchy(), getService()]);

  return (
    <UsersTable
      users={users}
      currentUserId={currentUser.id}
      tree={{
        service: service ? { id: service.id, name: service.name } : null,
        stages: stages.map((s) => ({
          id: s.id,
          name: s.name,
          divisions: s.divisions.map((d) => ({
            id: d.id,
            name: d.name,
            grades: d.grades.map((g) => ({ id: g.id, name: g.name, familyName: g.familyName })),
          })),
        })),
      }}
    />
  );
}
