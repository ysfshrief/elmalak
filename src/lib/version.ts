/**
 * تعريف النسخة المنشورة.
 *
 * حين يُصلَح عيبٌ ويظل ظاهرًا لصاحب الموقع، يكون السؤال الأول دائمًا: هل
 * وصل الإصلاح إلى الموقع أصلًا؟ وهذه المتغيّرات يضعها Vercel في كل نشر،
 * فتجيب عن السؤال بنظرة واحدة بدل التخمين.
 */
export function buildInfo() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  return {
    commit: sha ? sha.slice(0, 7) : "نسخة محلية",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "",
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "",
  };
}
