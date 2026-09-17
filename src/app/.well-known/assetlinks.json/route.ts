import { readFingerprints } from "@/lib/assetlinks";

/**
 * ربطُ تطبيق أندرويد بالموقع (Digital Asset Links).
 *
 * تطبيق «Khedmet El Malak» نافذةٌ موثوقة على هذا الموقع. وكروم لا يُخفي شريطَ
 * العنوان داخل التطبيق إلا إذا أعلن الموقعُ هنا أنه يقبل التطبيقَ الموقَّع
 * ببصمةٍ بعينها، وأعلن التطبيقُ في بيانه أنه يخصّ هذا الموقع. فالنصفان معًا
 * أو لا شيء.
 *
 * والبصمة تُقرأ من متغيّر بيئة لا من الكود: مفتاحُ التوقيع يُنشئه صاحبُ
 * التطبيق ولا يدخل المستودع، وتغييرُ البصمة هنا لا يحتاج بناءً جديدًا
 * للتطبيق. ويقبل المتغيّر أكثر من بصمة مفصولةً بفاصلة.
 */

export const dynamic = "force-dynamic";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME?.trim() || "com.khedmetelmalak.app";

export function GET() {
  const { valid } = readFingerprints(process.env.ANDROID_CERT_SHA256);

  const statements = valid.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: valid,
          },
        },
      ]
    : [];

  return Response.json(statements, {
    headers: {
      "Content-Type": "application/json",
      // خمس دقائق: تصحيحُ بصمةٍ خاطئة يجب أن يصل سريعًا، لا أن ينتظر ساعة.
      "Cache-Control": "public, max-age=300",
    },
  });
}
