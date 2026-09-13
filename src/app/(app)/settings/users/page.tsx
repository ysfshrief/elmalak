import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getAllUsers, getStages, getAllFamiliesFlat } from "@/lib/queries";
import { UsersTable } from "@/components/domain/UsersTable";

export const metadata: Metadata = { title: "المستخدمون" };

export default async function SettingsUsersPage() {
  const currentUser = await requireUser();
  const [users, stages, families] = await Promise.all([getAllUsers(), getStages(), getAllFamiliesFlat()]);

  return (
    <UsersTable
      users={users}
      stages={stages}
      families={families.map((f) => ({ id: f.id, name: f.name }))}
      currentUserId={currentUser.id}
    />
  );
}
