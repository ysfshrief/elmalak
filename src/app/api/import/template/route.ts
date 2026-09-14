import { getCurrentUser } from "@/lib/auth";
import { getScopedGradeOptions, getService } from "@/lib/queries";
import { buildTemplateWorkbook, TEMPLATE_FILENAME } from "@/lib/import/template";

/**
 * تنزيل قالب كشف المخدومين.
 *
 * القالب يُبنى لكل مستخدم على حدة: قائمة الصفوف المنسدلة بداخله لا تحوي إلا
 * صفوفه، فلا يستطيع أن يملأ ملفًا لصفٍّ لا يخدم فيه أصلًا.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("غير مصرّح", { status: 401 });

  const [grades, service] = await Promise.all([getScopedGradeOptions(user), getService()]);
  const buffer = await buildTemplateWorkbook({
    grades,
    serviceName: service?.name ?? "خدمة التربية الكنسية",
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // اسم الملف عربي، فيُرمَّز بـRFC 5987 ليصل سليمًا لكل المتصفّحات.
      "Content-Disposition": `attachment; filename="import-template.xlsx"; filename*=UTF-8''${encodeURIComponent(
        TEMPLATE_FILENAME
      )}`,
      "Cache-Control": "no-store",
    },
  });
}
