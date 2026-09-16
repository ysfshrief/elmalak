/**
 * قواعد صور المخدومين — مشتركة بين المتصفّح والخادم فلا تختلف الشروط بينهما.
 * (المتصفّح يمنع الملف الخطأ مبكّرًا، والخادم لا يثق به ويعيد الفحص.)
 */

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/** أقصى حجم للملف الذي يختاره المستخدم من جهازه. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * أقصى حجم يصل الخادم بعد المعالجة في المتصفّح. دون حدّ الطلب في بيئات
 * النشر بلا خادم (٤٫٥ ميجابايت)، ولا تقترب منه صورة وجه بعد التصغير.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** أقصى بُعد للصورة المحفوظة — يكفي للعرض بوضوح ويُبقي الملف خفيفًا. */
export const PHOTO_MAX_DIMENSION = 1200;
export const PHOTO_QUALITY = 0.85;

export function isAllowedPhotoType(type: string): boolean {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(type);
}

export function hasAllowedPhotoExtension(name: string): boolean {
  return ALLOWED_PHOTO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

/**
 * يتحقق أن البايتات صورةٌ من النوع المُعلَن فعلًا.
 *
 * ترويسة ‎Content-Type‎ يكتبها المرسِل فلا تُصدَّق: ملفٌ تنفيذي يُسمّى
 * ‎.jpg‎ سيمر لو اكتفينا بها. أمّا توقيع أول البايتات فمن الملف نفسه.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  const [b0, b1, b2, b3] = bytes;
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "image/jpeg";
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return "image/png";

  // RIFF....WEBP
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";

  return null;
}

export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} ميجابايت`;
  return `${Math.round(bytes / 1024)} كيلوبايت`;
}

/** امتداد الملف المناسب للنوع — يُستعمل في تسمية الملف داخل الخزنة. */
export function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
