"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Layers, Users, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DeletableRow, LongPressHint } from "@/components/ui/DeleteGesture";
import { Input, Select, Label, FieldError } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  createStageAction,
  createDivisionAction,
  createGradeAction,
  deleteStageAction,
  deleteDivisionAction,
  deleteGradeAction,
} from "@/actions/structure";

type Grade = { id: string; name: string; familyName: string | null; _count: { enrollments: number } };
type Division = { id: string; name: string; gender: string | null; grades: Grade[] };
type Stage = { id: string; name: string; divisions: Division[] };

type PendingDelete =
  | { kind: "stage"; id: string; name: string }
  | { kind: "division"; id: string; name: string }
  | { kind: "grade"; id: string; name: string };

function SimpleForm({
  label,
  placeholder,
  extra,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  extra?: React.ReactNode;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSubmit(name);
        } catch (err) {
          setError(err instanceof Error ? err.message : "تعذر الحفظ");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="entity-name" required>
          {label}
        </Label>
        <Input
          id="entity-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
        />
        <FieldError>{error}</FieldError>
      </div>
      {extra}
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

export function StructureManager({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [addStage, setAddStage] = React.useState(false);
  const [addDivisionTo, setAddDivisionTo] = React.useState<Stage | null>(null);
  const [addGradeTo, setAddGradeTo] = React.useState<{ stage: Stage; division: Division } | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<PendingDelete | null>(null);
  const [gender, setGender] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  function done(message: string) {
    toast.success(message);
    setAddStage(false);
    setAddDivisionTo(null);
    setAddGradeTo(null);
    setGender("");
    router.refresh();
  }

  /** يستعمله الضغط المطوّل — نفس الأفعال التي تستعملها أزرار الحذف الظاهرة. */
  const remove = React.useCallback(
    async (kind: "stage" | "division" | "grade", id: string) => {
      try {
        if (kind === "stage") await deleteStageAction(id);
        if (kind === "division") await deleteDivisionAction(id);
        if (kind === "grade") await deleteGradeAction(id);
        toast.success("تم الحذف");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "تعذّر الحذف");
        throw e;
      }
    },
    [router]
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      if (pendingDelete.kind === "stage") await deleteStageAction(pendingDelete.id);
      if (pendingDelete.kind === "division") await deleteDivisionAction(pendingDelete.id);
      if (pendingDelete.kind === "grade") await deleteGradeAction(pendingDelete.id);
      toast.success("تم الحذف");
      setPendingDelete(null);
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
        <Button onClick={() => setAddStage(true)}>
          <Plus className="size-4.5" />
          مرحلة جديدة
        </Button>
      </div>

      <LongPressHint>اضغط مطوّلًا على أي مرحلة أو قسم أو صف لحذفه</LongPressHint>

      <div className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.id} className="rounded-[var(--radius-lg)] border border-border bg-surface">
            <DeletableRow
              as="div"
              name={stage.name}
              description={`سيُحذف «${stage.name}» بكل أقسامه وصفوفه ومخدوميه، ولا يمكن التراجع.`}
              onDelete={() => remove("stage", stage.id)}
              className="flex items-center justify-between gap-3 border-b border-border p-4 data-[armed]:bg-error-soft/50"
            >
              <div className="flex items-center gap-2">
                <Layers className="size-4.5 text-primary" />
                <h3 className="font-bold text-ink">{stage.name}</h3>
                <Badge tone="neutral">{stage.divisions.length} قسم</Badge>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setAddDivisionTo(stage)}>
                  <Plus className="size-3.5" />
                  قسم
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDelete({ kind: "stage", id: stage.id, name: stage.name })}
                >
                  <Trash2 className="size-3.5 text-error" />
                </Button>
              </div>
            </DeletableRow>

            {stage.divisions.length === 0 ? (
              <p className="p-4 text-sm text-ink-faint">لا توجد أقسام في هذه المرحلة</p>
            ) : (
              stage.divisions.map((division) => (
                <div key={division.id} className="border-b border-border last:border-0">
                  <DeletableRow
                    as="div"
                    name={division.name}
                    description={`سيُحذف قسم «${division.name}» بكل صفوفه ومخدوميه، ولا يمكن التراجع.`}
                    onDelete={() => remove("division", division.id)}
                    className="flex items-center justify-between gap-3 bg-bg-alt/50 px-4 py-2.5 data-[armed]:bg-error-soft/50"
                  >
                    <p className="text-sm font-bold text-ink-muted">{division.name}</p>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setAddGradeTo({ stage, division })}>
                        <Plus className="size-3.5" />
                        صف
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPendingDelete({ kind: "division", id: division.id, name: division.name })
                        }
                      >
                        <Trash2 className="size-3.5 text-error" />
                      </Button>
                    </div>
                  </DeletableRow>

                  <ul className="divide-y divide-border">
                    {division.grades.map((grade) => (
                      <DeletableRow
                        key={grade.id}
                        name={grade.name}
                        description={`سيُحذف «${grade.name}» بكل مخدوميه وسجلاتهم، ولا يمكن التراجع.`}
                        onDelete={() => remove("grade", grade.id)}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 data-[armed]:bg-error-soft/50"
                      >
                        <Link href={`/grades/${grade.id}`} className="flex min-w-0 items-center gap-2 hover:text-primary">
                          <ChevronLeft className="size-4 shrink-0" />
                          <span className="truncate font-medium text-ink">{grade.name}</span>
                          {grade.familyName && (
                            <span className="truncate text-xs text-primary-ink">— {grade.familyName}</span>
                          )}
                          <span className="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                            <Users className="size-3.5" />
                            {grade._count.enrollments}
                          </span>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete({ kind: "grade", id: grade.id, name: grade.name })}
                        >
                          <Trash2 className="size-3.5 text-error" />
                        </Button>
                      </DeletableRow>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      <Modal open={addStage} onClose={() => setAddStage(false)} title="مرحلة جديدة" size="sm">
        <SimpleForm
          label="اسم المرحلة"
          placeholder="مثال: ثانوي"
          onSubmit={async (name) => {
            await createStageAction({ name, order: stages.length });
            done("تم إنشاء المرحلة");
          }}
        />
      </Modal>

      <Modal
        open={!!addDivisionTo}
        onClose={() => setAddDivisionTo(null)}
        title={addDivisionTo ? `قسم جديد في ${addDivisionTo.name}` : ""}
        size="sm"
      >
        {addDivisionTo && (
          <SimpleForm
            label="اسم القسم"
            placeholder="مثال: بنين"
            extra={
              <div>
                <Label htmlFor="division-gender">النوع</Label>
                <Select id="division-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">غير مُقسّم (مثل الحضانة)</option>
                  <option value="MALE">بنين</option>
                  <option value="FEMALE">بنات</option>
                </Select>
              </div>
            }
            onSubmit={async (name) => {
              await createDivisionAction({
                stageId: addDivisionTo.id,
                name,
                gender,
                order: addDivisionTo.divisions.length,
              });
              done("تم إنشاء القسم");
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!addGradeTo}
        onClose={() => setAddGradeTo(null)}
        title={addGradeTo ? `صف جديد في ${addGradeTo.stage.name} › ${addGradeTo.division.name}` : ""}
        size="sm"
      >
        {addGradeTo && (
          <SimpleForm
            label="اسم الصف"
            placeholder="مثال: الصف الأول"
            onSubmit={async (name) => {
              await createGradeAction({
                divisionId: addGradeTo.division.id,
                name,
                familyName: "",
                order: addGradeTo.division.grades.length,
              });
              done("تم إنشاء الصف");
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="تأكيد الحذف"
        description={pendingDelete ? `هل أنت متأكد من حذف "${pendingDelete.name}"؟` : ""}
        confirmLabel="حذف"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
