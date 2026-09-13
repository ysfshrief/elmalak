"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MemberForm } from "@/components/domain/MemberForm";
import { deleteMemberAction, toggleMemberActiveAction } from "@/actions/members";

type Member = {
  id: string;
  familyId: string;
  fullName: string;
  address: string | null;
  birthDate: Date | null;
  school: string | null;
  confessionFather: string | null;
  notes: string | null;
  isActive: boolean;
  phones: { id: string; label: string; number: string }[];
};

export function MemberDetailActions({ member }: { member: Member }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMemberAction(member.id);
      toast.success("تم حذف المخدوم");
      router.push(`/families/${member.familyId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleMemberActiveAction(member.id, !member.isActive);
      toast.success(member.isActive ? "تم تعطيل المخدوم" : "تم تفعيل المخدوم");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleToggle} loading={toggling}>
          <Power className="size-4" />
          {member.isActive ? "تعطيل" : "تفعيل"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          تعديل
        </Button>
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" />
          حذف
        </Button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل بيانات المخدوم">
        <MemberForm
          familyId={member.familyId}
          member={member}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف المخدوم"
        description={`هل أنت متأكد من حذف "${member.fullName}"؟ لا يمكن التراجع عن هذا الإجراء، وسيتم حذف كل سجلات الحضور والافتقاد المرتبطة به.`}
        confirmLabel="حذف نهائيًا"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
