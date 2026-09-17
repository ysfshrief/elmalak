/**
 * رابط موقع المخدوم.
 *
 * يُحفظ كما شاركه صاحبه حرفًا بحرف: روابط المشاركة القصيرة من خرائط جوجل
 * (`maps.app.goo.gl/…`) وغيرِها تُفكّ عند فتحها لا عند حفظها، وأيُّ محاولةٍ
 * لتحويلها إلى إحداثيات أو إلى رابطٍ «أفضل» تُفسد ما لا يُفهم إلا عند المصدر.
 * فلا يُقصّ منه شيء ولا يُبدَّل، ولا يُفرض عليه مزوّدُ خرائطٍ بعينه: يُسلَّم
 * إلى الجهاز، والجهاز يفتحه بما اختاره صاحبُه من تطبيقات.
 *
 * والتحقّق الوحيد المفروض عليه أمنيّ: عنوانٌ صحيح، وبروتوكولُه `http` أو
 * `https` لا غير. فرابطٌ يبدأ بـ`javascript:` في وسم `<a>` تنفيذُ شيفرةٍ في
 * متصفّح كل من يضغطه، لا انتقالٌ إلى مكان.
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"];

export function isSafeLocationUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

/** نصٌّ قصير يُعرض بدل الرابط الطويل — الرابط نفسه لا يتغيّر. */
export function locationHost(value: string) {
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return value;
  }
}
