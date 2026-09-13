"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Layers, Users, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FamilyForm } from "@/components/domain/FamilyForm";
import { createStageAction, deleteStageAction, deleteFamilyAction } from "@/actions/families";

type Family = { id: string; name: string; stageId: string; _count: { members: number } };
type Stage = { id: string; name: string; order: number; families: Family[] };

function StageForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createStageAction({ name, order: 0 });
      toast.success("تم إنشاء المرحلة بنجاح");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="stage-name" required>
          اسم المرحلة
        </Label>
        <Input
          id="stage-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: إعدادي بنين"
        />
        <FieldError>{error}</FieldError>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          إنشاء المرحلة
        </Button>
      </div>
    </form>
  );
}

export function StructureManager({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [addStageOpen, setAddStageOpen] = React.useState(false);
  const [addFamilyStage, setAddFamilyStage] = React.useState<Stage | null>(null);
  const [deleteStage, setDeleteStage] = React.useState<Stage | null>(null);
  const [deleteFamily, setDeleteFamily] = React.useState<Family | null>(null);
  const [busy, setBusy] = React.useState(false);

  function refresh() {
    setAddStageOpen(false);
    setAddFamilyStage(null);
    router.refresh();
  }

  async function handleDeleteStage() {
    if (!deleteStage) return;
    setBusy(true);
    try {
      await deleteStageAction(deleteStage.id);
      toast.success("تم حذف المرحلة");
      setDeleteStage(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFamily() {
    if (!deleteFamily) return;
    setBusy(true);
    try {
      await deleteFamilyAction(deleteFamily.id);
      toast.success("تم حذف الأسرة");
      setDeleteFamily(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddStageOpen(true)}>
          <Plus className="size-4.5" />
          مرحلة جديدة
        </Button>
      </div>

      <div className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.id} className="rounded-[var(--radius-lg)] border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Layers className="size-4.5 text-primary" />
                <h3 className="font-bold text-ink">{stage.name}</h3>
                <Badge tone="neutral">{stage.families.length} أسرة</Badge>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setAddFamilyStage(stage)}>
                  <Plus className="size-3.5" />
                  أسرة
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteStage(stage)}>
                  <Trash2 className="size-3.5 text-error" />
                </Button>
              </div>
            </div>
            {stage.families.length === 0 ? (
              <p className="p-4 text-sm text-ink-faint">لا توجد أسر في هذه المرحلة</p>
            ) : (
              <ul className="divide-y divide-border">
                {stage.families.map((family) => (
                  <li key={family.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/families/${family.id}`} className="flex min-w-0 items-center gap-2 hover:text-primary">
                      <ChevronLeft className="size-4 shrink-0" />
                      <span className="truncate font-medium text-ink">{family.name}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                        <Users className="size-3.5" />
                        {family._count.members}
                      </span>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteFamily(family)}>
                      <Trash2 className="size-3.5 text-error" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <Modal open={addStageOpen} onClose={() => setAddStageOpen(false)} title="مرحلة جديدة">
        <StageForm onSuccess={refresh} />
      </Modal>

      <Modal open={!!addFamilyStage} onClose={() => setAddFamilyStage(null)} title="أسرة جديدة">
        {addFamilyStage && (
          <FamilyForm stages={[{ id: addFamilyStage.id, name: addFamilyStage.name }]} onSuccess={refresh} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteStage}
        onOpenChange={(open) => !open && setDeleteStage(null)}
        title="حذف المرحلة"
        description={deleteStage ? `هل أنت متأكد من حذف مرحلة "${deleteStage.name}"؟` : ""}
        confirmLabel="حذف نهائيًا"
        loading={busy}
        onConfirm={handleDeleteStage}
      />

      <ConfirmDialog
        open={!!deleteFamily}
        onOpenChange={(open) => !open && setDeleteFamily(null)}
        title="حذف الأسرة"
        description={deleteFamily ? `هل أنت متأكد من حذف أسرة "${deleteFamily.name}"؟` : ""}
        confirmLabel="حذف نهائيًا"
        loading={busy}
        onConfirm={handleDeleteFamily}
      />
    </div>
  );
}
