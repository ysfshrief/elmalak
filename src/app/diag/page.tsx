import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { roleLabel, canDeleteChild, canManageUsers } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { GestureProbe } from "@/components/domain/GestureProbe";

export const metadata: Metadata = { title: "فحص الجهاز" };

/**
 * صفحةُ تشخيص، خارج الموقع وخارج قائمته.
 *
 * وُضعت هنا لا في الإعدادات لأن الإعدادات نفسها قد تكون غير ظاهرة — إمّا لأن
 * النسخة التي يعرضها المتصفّح قديمة، وإمّا لأن صلاحية الحساب لا تُظهرها. وحين
 * يكون بابُ التشخيص خلف البابِ المعطوب لا يُفتح أيٌّ منهما. فهذه الصفحة
 * يُوصل إليها بكتابة `‎/diag` بعد عنوان الموقع، ولا تحتاج إلى قائمة ولا إلى
 * صلاحية، وتجيب عن ثلاثة أسئلة بالترتيب:
 *
 *   ١) أيُّ نسخةٍ يعرضها متصفّحُك الآن؟ (فوجودُ هذه الصفحة نفسه جواب)
 *   ٢) بأيّ حسابٍ أنت داخل، وهل يملك حذفًا أصلًا؟
 *   ٣) ماذا يفعل إصبعُك بالضبط حين تضغط مطوّلًا؟
 */
export default async function DiagnosticsPage() {
  const user = await getCurrentUser();
  const commit = process.env.APP_COMMIT || "غير معروف";
  const message = process.env.APP_COMMIT_MSG || "—";
  const builtAt = process.env.APP_BUILT_AT || "—";

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <header className="pt-2">
        <h1 className="text-xl font-extrabold text-ink">فحص الجهاز</h1>
        <p className="mt-1 text-sm text-ink-muted">
          صفحةٌ للتشخيص فقط — لا تُغيّر شيئًا في البيانات.{" "}
          <Link href="/dashboard" className="font-semibold text-primary hover:underline">
            العودة للموقع
          </Link>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>١) النسخة التي تعمل على جهازك الآن</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row label="رقم النسخة (commit)" value={commit} mono />
          <Row label="عنوان آخر تعديل" value={message} />
          <Row label="وقت البناء" value={builtAt} mono />
          <p className="pt-2 text-xs text-ink-faint">
            هذه القيم تُطبع داخل الموقع وقتَ بنائه، فهي تصف النسخة التي يعرضها متصفّحك
            فعلًا — لا آخر ما رُفع على GitHub. واختلافُهما يعني أن النشر لم يصل إلى العنوان
            الذي تفتحه.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>٢) الحساب الذي تستعمله على هذا الجهاز</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {user ? (
            <>
              <Row label="الاسم" value={user.name} />
              <Row label="اسم الدخول" value={user.username} mono />
              <Row label="الصلاحية" value={roleLabel(user.role, user.gender)} />
              <Row label="يستطيع حذف المخدومين" value={canDeleteChild(user.role) ? "نعم" : "لا"} />
              <Row label="يرى «الإعدادات»" value={canManageUsers(user.role) ? "نعم" : "لا"} />
              <p className="pt-2 text-xs text-ink-faint">
                الحذف متاحٌ لمسؤول النظام وأمين الخدمة وأمين المرحلة. فإن كان الجواب «لا»
                فلن يظهر لك زرُّ حذفٍ ولا تعمل الضغطة المطوّلة — لا لعطبٍ في الموقع، بل لأن
                هذا الحساب لا يملكها. وقد يكون حسابُك على الحاسوب غير حسابك هنا.
              </p>
            </>
          ) : (
            <p className="text-ink-muted">لست داخلًا بأي حساب على هذا الجهاز.</p>
          )}
        </CardContent>
      </Card>

      <GestureProbe />
    </main>
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
