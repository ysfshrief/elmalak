"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Users, ChevronLeft } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { FamilyForm } from "@/components/domain/FamilyForm";

type Family = {
  id: string;
  name: string;
  stage: { id: string; name: string };
  _count: { members: number };
};

export function FamiliesGrid({
  families,
  stages,
  canCreate,
}: {
  families: Family[];
  stages: { id: string; name: string }[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return families;
    return families.filter((f) => f.name.includes(q) || f.stage.name.includes(q));
  }, [families, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="ابحث عن أسرة أو مرحلة..." className="sm:max-w-xs" />
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4.5" />
            أسرة جديدة
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "لا توجد نتائج" : "لا توجد أسر بعد"}
          description={query ? "جرّب كلمات بحث أخرى" : "ابدأ بإنشاء أول أسرة في الخدمة"}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <Link
              key={f.id}
              href={`/families/${f.id}`}
              className="group flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)] active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{f.name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge tone="primary">{f.stage.name}</Badge>
                  <span className="flex items-center gap-1 text-xs text-ink-faint">
                    <Users className="size-3.5" />
                    {f._count.members}
                  </span>
                </div>
              </div>
              <ChevronLeft className="size-5 shrink-0 text-ink-faint transition-transform group-hover:-translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء أسرة جديدة">
        <FamilyForm
          stages={stages}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
            toast.dismiss();
          }}
        />
      </Modal>
    </div>
  );
}
