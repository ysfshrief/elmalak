"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Phone, Cake, School, Users } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { MemberForm } from "@/components/domain/MemberForm";
import { formatArabicDate, calculateAge } from "@/lib/utils";

type Member = {
  id: string;
  fullName: string;
  address: string | null;
  birthDate: Date | null;
  school: string | null;
  confessionFather: string | null;
  notes: string | null;
  isActive: boolean;
  phones: { id: string; label: string; number: string }[];
};

export function FamilyMembersList({
  familyId,
  members,
  canEdit,
}: {
  familyId: string;
  members: Member[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return members;
    return members.filter((m) => m.fullName.includes(q) || m.school?.includes(q) || m.address?.includes(q));
  }, [members, query]);

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
    toast.dismiss();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="ابحث بالاسم أو المدرسة..." className="sm:max-w-xs" />
        {canEdit && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4.5" />
            إضافة مخدوم
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "لا توجد نتائج" : "لا يوجد مخدومين بعد"}
          description={query ? "جرّب كلمات بحث أخرى" : "ابدأ بإضافة أول مخدوم في هذه الأسرة"}
          action={
            canEdit && !query ? (
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                إضافة مخدوم
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
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
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer transition-colors hover:bg-bg-alt"
                    onClick={() => router.push(`/members/${m.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.fullName} size="sm" />
                        <span className="font-semibold text-ink">{m.fullName}</span>
                        {!m.isActive && <Badge tone="neutral">غير نشط</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted tabular-nums">
                      {formatArabicDate(m.birthDate)}
                      {m.birthDate && <span className="text-ink-faint"> ({calculateAge(m.birthDate)} سنة)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{m.school || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{m.confessionFather || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted tabular-nums">{m.phones[0]?.number || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2.5 sm:hidden">
            {filtered.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 active:scale-[0.99] transition-transform"
                >
                  <Avatar name={m.fullName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-ink">{m.fullName}</p>
                      {!m.isActive && <Badge tone="neutral">غير نشط</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                      {m.birthDate && (
                        <span className="flex items-center gap-1">
                          <Cake className="size-3.5" />
                          {formatArabicDate(m.birthDate)}
                        </span>
                      )}
                      {m.school && (
                        <span className="flex items-center gap-1">
                          <School className="size-3.5" />
                          {m.school}
                        </span>
                      )}
                      {m.phones[0] && (
                        <span className="flex items-center gap-1 tabular-nums">
                          <Phone className="size-3.5" />
                          {m.phones[0].number}
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
        <MemberForm familyId={familyId} onSuccess={handleSuccess} />
      </Modal>
    </div>
  );
}
