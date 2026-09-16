import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getService } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AttendancePointsForm } from "@/components/domain/AttendancePointsForm";

export const metadata: Metadata = { title: "نقاط الحضور" };

export default async function AttendancePointsPage() {
  await requireRole(["ADMIN"]);
  const service = await getService();

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle>نظام نقاط الحضور</CardTitle>
      </CardHeader>
      <CardContent>
        <AttendancePointsForm
          enabled={service?.attendancePointsEnabled ?? false}
          pointValue={service?.attendancePointValue ?? 1}
        />
      </CardContent>
    </Card>
  );
}
