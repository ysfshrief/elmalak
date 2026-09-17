/**
 * ربطُ تطبيق أندرويد بالموقع (Digital Asset Links).
 *
 * تطبيق «Khedmet El Malak» نافذةٌ موثوقة على هذا الموقع (Trusted Web Activity).
 * وكروم لا يُخفي شريطَ العنوان داخل التطبيق إلا إذا أعلن الموقعُ هنا أنه يقبل
 * التطبيقَ الموقَّع ببصمةٍ بعينها. فبلا هذا الملف يعمل التطبيق، لكنه يظهر
 * كمتصفّحٍ بشريط عنوان.
 *
 * والبصمة تُقرأ من متغيّر بيئة لا من الكود: مفتاحُ التوقيع يُنشئه صاحبُ
 * التطبيق على جهازه ولا يدخل المستودع، وتغييرُ البصمة هنا لا يحتاج بناءً
 * جديدًا للتطبيق. ويقبل المتغيّر أكثر من بصمة مفصولةً بفاصلة (مفتاح التطوير
 * ومفتاح الإصدار، أو مفتاح Play عند النشر عليه).
 */

export const dynamic = "force-dynamic";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME?.trim() || "com.khedmetelmalak.app";

function fingerprints() {
  return (process.env.ANDROID_CERT_SHA256 || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
}

export function GET() {
  const sha256_cert_fingerprints = fingerprints();

  const statements = sha256_cert_fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints,
          },
        },
      ]
    : [];

  return Response.json(statements, {
    headers: {
      "Content-Type": "application/json",
      // يقرأه كروم عند التثبيت وأحيانًا بعده؛ ساعةٌ كافية ولا تُجمّد تغييرًا.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
