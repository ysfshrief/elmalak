"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, UserCog } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { UserForm, type ScopeTree } from "@/components/domain/UserForm";
import { roleLabel } from "@/lib/roles";
import { deleteUserAction, toggleUserActiveAction } from "@/actions/users";
import type { Role, Gender } from "@prisma/client";

export type UserRow = {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  role: Role;
  gender: Gender | null;
  isActive: boolean;
  assignments: {
    serviceId: string | null;
    stageId: string | null;
    divisionId: string | null;
    gradeId: string | null;
    service: { name: string } | null;
    stage: { name: string } | null;
    division: { name: string; stage: { name: string } } | null;
    grade: { name: string; division: { name: string; stage: { name: string } } } | null;
  }[];
};

function scopeLabel(a: UserRow["assignments"][number]) {
  if (a.service) return `الخدمة كلها`;
  if (a.stage) return `مرحلة ${a.stage.name}`;
  if (a.division) return `${a.division.stage.name} › ${a.division.name}`;
  if (a.grade) return `${a.grade.division.stage.name} › ${a.grade.division.name} › ${a.grade.name}`;
  return "بدون نطاق";
}

export function UsersTable({
  users,
  tree,
  currentUserId,
}: {
  users: UserRow[];
  tree: ScopeTree;
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<UserRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return users;
    return users.filter((u) => u.name.includes(q) || u.username.includes(q));
  }, [users, query]);

  function refresh() {
    setCreateOpen(false);
    setEditUser(null);
    router.refresh();
  }

  async function handleToggle(u: UserRow) {
    try {
      await toggleUserActiveAction(u.id, !u.isActive);
      toast.success(u.isActive ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setBusy(true);
    try {
      await deleteUserAction(deleteUser.id);
      toast.success("تم حذف المستخدم");
      setDeleteUser(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو اسم المستخدم..."
          className="sm:max-w-xs"
        />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4.5" />
          مستخدم جديد
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserCog} title="لا يوجد مستخدمون" />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar name={u.name} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-ink">{u.name}</p>
                    {!u.isActive && <Badge tone="neutral">معطّل</Badge>}
                  </div>
                  <p className="text-xs text-ink-faint" dir="ltr">
                    @{u.username}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">{roleLabel(u.role, u.gender)}</Badge>
                    {u.assignments.map((a, i) => (
                      <Badge key={i} tone="secondary">
                        {scopeLabel(a)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-1.5">
                <Button variant="outline" size="sm" onClick={() => handleToggle(u)} disabled={u.id === currentUserId}>
                  <Power className="size-3.5" />
                  {u.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditUser(u)}>
                  <Pencil className="size-3.5" />
                  تعديل
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteUser(u)} disabled={u.id === currentUserId}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="مستخدم جديد" size="lg">
        <UserForm tree={tree} onSuccess={refresh} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="تعديل المستخدم" size="lg">
        {editUser && <UserForm tree={tree} user={editUser} onSuccess={refresh} />}
      </Modal>

      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        title="حذف المستخدم"
        description={deleteUser ? `هل أنت متأكد من حذف حساب "${deleteUser.name}"؟` : ""}
        confirmLabel="حذف نهائيًا"
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
