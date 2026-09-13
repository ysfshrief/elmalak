"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Clock3, ClipboardCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";
import { createAttendanceSessionAction, setAttendanceStatusAction } from "@/actions/attendance";
import type { AttendanceStatus } from "@prisma/client";

type Member = { id: string; fullName: string };

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: typeof Check; tone: string }> = {
  PRESENT: { label: "حاضر", icon: Check, tone: "bg-success text-white" },
  ABSENT: { label: "غائب", icon: X, tone: "bg-error text-white" },
  EXCUSED: { label: "بعذر", icon: Clock3, tone: "bg-warning text-white" },
};

export function AttendanceGrid({
  familyId,
  date,
  sessionId,
  members,
  initialStatuses,
}: {
  familyId: string;
  date: string;
  sessionId: string | null;
  members: Member[];
  initialStatuses: Record<string, AttendanceStatus>;
}) {
  const router = useRouter();
  // Parent pages mount this component with `key={date}` (or `key={year-month}`
  // for visitation), so a new session/date always remounts fresh state here
  // instead of needing an effect to re-sync from props.
  const [statuses, setStatuses] = React.useState(initialStatuses);
  const [creating, setCreating] = React.useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState(sessionId);

  const presentCount = Object.values(statuses).filter((s) => s === "PRESENT").length;

  async function handleStart() {
    setCreating(true);
    try {
      const session = await createAttendanceSessionAction({ familyId, date });
      setCurrentSessionId(session.id);
      const next: Record<string, AttendanceStatus> = {};
      members.forEach((m) => (next[m.id] = "ABSENT"));
      setStatuses(next);
      toast.success("تم بدء تسجيل الحضور لهذا اليوم");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر بدء الجلسة");
    } finally {
      setCreating(false);
    }
  }

  async function handleSetStatus(memberId: string, status: AttendanceStatus) {
    if (!currentSessionId) return;
    const previous = statuses[memberId];
    setStatuses((s) => ({ ...s, [memberId]: status }));
    try {
      await setAttendanceStatusAction(currentSessionId, memberId, status);
    } catch (e) {
      setStatuses((s) => ({ ...s, [memberId]: previous! }));
      toast.error(e instanceof Error ? e.message : "تعذر حفظ الحالة");
    }
  }

  if (!currentSessionId) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="لم يتم تسجيل حضور هذا اليوم بعد"
        description="اضغط على الزر التالي لبدء تسجيل حضور أعضاء الأسرة لهذا التاريخ"
        action={
          <Button onClick={handleStart} loading={creating}>
            بدء تسجيل الحضور
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-bg-alt px-4 py-2.5 text-sm">
        <span className="font-semibold text-ink">
          الحاضرون: <span className="tabular-nums text-success">{presentCount}</span> / {members.length}
        </span>
      </div>

      <ul className="space-y-2">
        {members.map((m) => {
          const status = statuses[m.id] ?? "ABSENT";
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3"
            >
              <Avatar name={m.fullName} size="sm" />
              <span className="flex-1 truncate font-semibold text-ink">{m.fullName}</span>
              <div className="flex gap-1.5">
                {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const active = status === s;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSetStatus(m.id, s)}
                      aria-pressed={active}
                      aria-label={cfg.label}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full transition-all active:scale-90",
                        active ? cfg.tone + " shadow-[var(--shadow-sm)]" : "bg-bg-alt text-ink-faint hover:bg-border-strong/40"
                      )}
                    >
                      <Icon className="size-4.5" />
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
