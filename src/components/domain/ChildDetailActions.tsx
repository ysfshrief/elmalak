"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ChildForm } from "@/components/domain/ChildForm";
import { deleteChildAction, toggleChildActiveAction } from "@/actions/children";

export function ChildDetailActions({
  enrollmentId,
  gradeId,
  canDelete,
  child,
}: {
  enrollmentId: string;
  gradeId: string;
  canDelete: boolean;
  child: {
    fullName: string;
    gender: string | null;
    address: string | null;
    birthDate: Date | null;
    school: string | null;
    confessionFather: string | null;
    notes: string | null;
    isActive: boolean;
    phones: { label: string; number: string }[];
  };
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteChildAction(enrollmentId);
      toast.success("تم حذف المخدوم");
      router.push(`/grades/${gradeId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  async function handleToggle() {
    setBusy(true);
    try {
      await toggleChildActiveAction(enrollmentId, !child.isActive);
      toast.success(child.isActive ? "تم تعطيل المخدوم" : "تم تفعيل المخدوم");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleToggle} loading={busy}>
          <Power className="size-4" />
          {child.isActive ? "تعطيل" : "تفعيل"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          تعديل
        </Button>
        {canDelete && (
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            حذف
          </Button>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل بيانات المخدوم">
        <ChildForm
          gradeId={gradeId}
          enrollmentId={enrollmentId}
          child={child}
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
        description={`هل أنت متأكد من حذف "${child.fullName}"؟ سيتم حذف كل سجلات الحضور والافتقاد الخاصة به في كل السنوات، ولا يمكن التراجع.`}
        confirmLabel="حذف نهائيًا"
        loading={busy}
        onConfirm={handleDelete}
      />
    </>
  );
}
