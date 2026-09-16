"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Phone, Cake, School, Users, Pencil } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { ChildForm } from "@/components/domain/ChildForm";
import { setGradeFamilyNameAction } from "@/actions/structure";
import { childPhotoUrl } from "@/lib/photo-client";
import { formatArabicDate, calculateAge } from "@/lib/utils";

type Row = {
  enrollmentId: string;
  child: {
    id: string;
    photoFileId: string | null;
    fullName: string;
    birthDate: Date | null;
    school: string | null;
    confessionFather: string | null;
    isActive: boolean;
    phones: { id: string; label: string; number: string }[];
  };
};

function photoOf(child: Row["child"]) {
  return child.photoFileId ? childPhotoUrl(child.id, child.photoFileId) : null;
}

export function GradeChildrenList({
  gradeId,
  familyName,
  canRenameFamily,
  rows,
}: {
  gradeId: string;
  familyName: string | null;
  canRenameFamily: boolean;
  rows: Row[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(familyName ?? "");
  const [savingName, setSavingName] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.child.fullName.includes(q) ||
        r.child.school?.includes(q) ||
        r.child.confessionFather?.includes(q)
    );
  }, [rows, query]);

  async function saveFamilyName() {
    setSavingName(true);
    try {
      await setGradeFamilyNameAction({ gradeId, familyName: nameDraft });
      toast.success("تم حفظ اسم الأسرة");
      setRenameOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو المدرسة..."
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          {canRenameFamily && (
            <Button variant="outline" onClick={() => setRenameOpen(true)}>
              <Pencil className="size-4" />
              اسم الأسرة
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4.5" />
            إضافة مخدوم
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "لا توجد نتائج" : "لا يوجد مخدومون في هذا الصف"}
          description={query ? "جرّب كلمات بحث أخرى" : "ابدأ بإضافة أول مخدوم"}
          action={
            !query ? (
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                إضافة مخدوم
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-border sm:block">
            <table className="w-full text-sm">
              <thead className="bg-bg-alt text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold">تاريخ الميلاد</th>
                  <th className="px-4 py-3 text-right font-semibold">المدرسة</th>
                  <th className="px-4 py-3 text-right font-semibold">أب الاعتراف</th>
                  <th className="px-4 py-3 text-right font-semibold">تليفون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr
                    key={r.enrollmentId}
                    className="cursor-pointer transition-colors hover:bg-bg-alt"
                    onClick={() => router.push(`/children/${r.enrollmentId}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.child.fullName} src={photoOf(r.child)} size="sm" />
                        <span className="font-semibold text-ink">{r.child.fullName}</span>
                        {!r.child.isActive && <Badge tone="neutral">غير نشط</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted tabular-nums">
                      {formatArabicDate(r.child.birthDate)}
                      {r.child.birthDate && (
                        <span className="text-ink-faint"> ({calculateAge(r.child.birthDate)} سنة)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{r.child.school || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{r.child.confessionFather || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted tabular-nums">
                      {r.child.phones[0]?.number || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2.5 sm:hidden">
            {filtered.map((r) => (
              <li key={r.enrollmentId}>
                <Link
                  href={`/children/${r.enrollmentId}`}
                  className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 active:scale-[0.99] transition-transform"
                >
                  <Avatar name={r.child.fullName} src={photoOf(r.child)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-ink">{r.child.fullName}</p>
                      {!r.child.isActive && <Badge tone="neutral">غير نشط</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                      {r.child.birthDate && (
                        <span className="flex items-center gap-1">
                          <Cake className="size-3.5" />
                          {formatArabicDate(r.child.birthDate)}
                        </span>
                      )}
                      {r.child.school && (
                        <span className="flex items-center gap-1">
                          <School className="size-3.5" />
                          {r.child.school}
                        </span>
                      )}
                      {r.child.phones[0] && (
                        <span className="flex items-center gap-1 tabular-nums">
                          <Phone className="size-3.5" />
                          {r.child.phones[0].number}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مخدوم جديد">
        <ChildForm
          gradeId={gradeId}
          onSuccess={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      </Modal>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="اسم أسرة الفصل" size="sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="familyName">اسم الأسرة</Label>
            <Input
              id="familyName"
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="مثال: أسرة الملاك ميخائيل والقديس أبانوب"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveFamilyName} loading={savingName}>
              حفظ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
