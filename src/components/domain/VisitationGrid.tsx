"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, MessageSquarePlus, HeartHandshake } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { setVisitationAction } from "@/actions/visitation";

type Row = { enrollmentId: string; fullName: string };
type Entry = { visited: boolean; note: string };

export function VisitationGrid({
  year,
  month,
  rows,
  initialEntries,
}: {
  year: number;
  month: number;
  rows: Row[];
  initialEntries: Record<string, Entry>;
}) {
  // The parent page mounts this component with `key={`${year}-${month}`}`,
  // so switching months remounts with fresh state instead of needing an
  // effect to re-sync from props.
  const [entries, setEntries] = React.useState(initialEntries);
  const [openNoteFor, setOpenNoteFor] = React.useState<string | null>(null);

  const visitedCount = Object.values(entries).filter((e) => e.visited).length;

  async function persist(enrollmentId: string, next: Entry) {
    try {
      await setVisitationAction({
        enrollmentId,
        year,
        month,
        visited: next.visited,
        note: next.note,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ البيانات");
    }
  }

  function toggleVisited(enrollmentId: string) {
    const current = entries[enrollmentId] ?? { visited: false, note: "" };
    const next = { ...current, visited: !current.visited };
    setEntries((s) => ({ ...s, [enrollmentId]: next }));
    persist(enrollmentId, next);
  }

  function updateNote(enrollmentId: string, note: string) {
    setEntries((s) => ({ ...s, [enrollmentId]: { ...(s[enrollmentId] ?? { visited: false, note: "" }), note } }));
  }

  function saveNote(enrollmentId: string) {
    const current = entries[enrollmentId] ?? { visited: false, note: "" };
    persist(enrollmentId, current);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-bg-alt px-4 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <HeartHandshake className="size-4 text-info" />
          تم افتقاد: <span className="tabular-nums text-info">{visitedCount}</span> / {rows.length}
        </span>
      </div>

      <ul className="space-y-2">
        {rows.map((m) => {
          const entry = entries[m.enrollmentId] ?? { visited: false, note: "" };
          const noteOpen = openNoteFor === m.enrollmentId;
          return (
            <li key={m.enrollmentId} className="rounded-[var(--radius-lg)] border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.fullName} size="sm" />
                <span className="flex-1 truncate font-semibold text-ink">{m.fullName}</span>

                <button
                  type="button"
                  onClick={() => setOpenNoteFor(noteOpen ? null : m.enrollmentId)}
                  aria-label="إضافة ملاحظة"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    entry.note ? "bg-info-soft text-info" : "text-ink-faint hover:bg-bg-alt"
                  )}
                >
                  <MessageSquarePlus className="size-4.5" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleVisited(m.enrollmentId)}
                  aria-pressed={entry.visited}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-all active:scale-95",
                    entry.visited ? "bg-success text-white" : "bg-bg-alt text-ink-faint hover:bg-border-strong/40"
                  )}
                >
                  <Check className="size-4" />
                  {entry.visited ? "تم" : "لم يتم"}
                </button>
              </div>

              {noteOpen && (
                <div className="mt-2.5 animate-fade-in-up" style={{ animationDuration: "0.2s" }}>
                  <Textarea
                    rows={2}
                    value={entry.note}
                    onChange={(e) => updateNote(m.enrollmentId, e.target.value)}
                    onBlur={() => saveNote(m.enrollmentId)}
                    placeholder="اكتب ملاحظة عن الافتقاد..."
                    className="text-sm"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
