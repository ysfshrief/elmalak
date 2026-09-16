"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DeletableRow, LongPressHint } from "@/components/ui/DeleteGesture";
import { deleteAttendanceSessionAction } from "@/actions/attendance";
import { formatArabicDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AttendanceHistory({
  gradeId,
  activeDate,
  sessions,
}: {
  gradeId: string;
  activeDate: string;
  sessions: { id: string; date: string; present: number; total: number }[];
}) {
  const router = useRouter();

  return (
    <>
      <LongPressHint>اضغط مطوّلًا على أي اجتماع لحذفه</LongPressHint>
      <ul className="mt-2 divide-y divide-border">
        {sessions.map((session) => (
          <DeletableRow
            key={session.id}
            name={`اجتماع ${formatArabicDate(session.date)}`}
            description={`سيُحذف الاجتماع وكل سجلات الحضور المرتبطة به، ولا يمكن التراجع.`}
            onDelete={async () => {
              try {
                await deleteAttendanceSessionAction(session.id);
                toast.success("تم حذف الاجتماع");
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "تعذّر الحذف");
                throw e;
              }
            }}
            className="data-[armed]:bg-error-soft/40"
          >
            <Link
              href={`/attendance/${gradeId}?date=${session.date}`}
              className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
            >
              <span className={cn(session.date === activeDate ? "font-bold text-primary" : "text-ink")}>
                {formatArabicDate(session.date)}
              </span>
              <span className="tabular-nums text-ink-faint">
                {session.present} / {session.total} حاضر
              </span>
            </Link>
          </DeletableRow>
        ))}
      </ul>
    </>
  );
}
