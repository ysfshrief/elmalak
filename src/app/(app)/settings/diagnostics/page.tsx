import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { GestureProbe } from "@/components/domain/GestureProbe";

export const metadata: Metadata = { title: "فحص الجهاز" };

/**
 * صفحةُ تشخيص.
 *
 * حين تعمل الإيماءة في كل جهازٍ أملكه وتفشل في جهازك، لا يُصلح الخلافَ مزيدٌ
 * من التخمين: يُصلحه أن يقول جهازُك بنفسه ما جرى. هنا يظهر رقمُ النسخة التي
 * تعمل عندك فعلًا — فيُحسم أولًا هل ما تجرّبه هو آخر ما رُفع — ثم صندوقٌ
 * يسجّل كل حدثٍ يُطلقه إصبعُك بالترتيب وبالتوقيت، ويقول أين انقطعت الإيماءة.
 */
export default async function DiagnosticsPage() {
  await requireRole(["ADMIN"]);

  const commit = process.env.APP_COMMIT || "غير معروف";
  const message = process.env.APP_COMMIT_MSG || "—";
  const builtAt = process.env.APP_BUILT_AT || "—";

  return (
    <div className="space-y-4">
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>النسخة التي تعمل على جهازك الآن</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row label="رقم النسخة (commit)" value={commit} mono />
          <Row label="عنوان آخر تعديل" value={message} />
          <Row label="وقت البناء" value={builtAt} mono />
          <p className="pt-2 text-xs text-ink-faint">
            هذه القيم تُطبع داخل الموقع وقتَ بنائه، فهي تصف النسخة التي يعرضها متصفّحك
            فعلًا — لا آخر ما رُفع على GitHub. اختلافُهما يعني أن النشر لم يصل بعد،
            أو أن المتصفّح ما زال يعرض نسخةً محفوظة.
          </p>
        </CardContent>
      </Card>

      <GestureProbe />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-1.5 last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className={mono ? "font-mono text-xs text-ink" : "font-semibold text-ink"} dir="ltr">
        {value}
      </span>
    </div>
  );
}
