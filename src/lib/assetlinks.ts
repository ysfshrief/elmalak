/**
 * بصمةُ توقيع تطبيق أندرويد، كما يقرأها كروم.
 *
 * التحقّق صارمٌ في الشكل النهائي ومتساهلٌ في المُدخَل عمدًا: البصمة تُنسخ من
 * `keytool` أو من ملخّص البناء أو من صفحة، فتصل أحيانًا بأحرفٍ صغيرة، أو بلا
 * نقطتين، أو ومعها سطرٌ جديد. ورفضُها بصمتٍ لهذا السبب يُنتج ملفَ ربطٍ فارغًا،
 * فيظهر شريطُ العنوان داخل التطبيق بلا أن يعرف أحدٌ لماذا — وهو ما حدث.
 *
 * فتُقبل كل هذه الصور وتُردّ إلى صورةٍ واحدة: ٣٢ بايتًا بأحرفٍ كبيرة تفصلها
 * نقطتان. وما لا يمكن ردّه إليها يُذكر سببُه في صفحة الفحص.
 */

const HEX_64 = /^[0-9A-F]{64}$/;
const CANONICAL = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export type FingerprintCheck = {
  /** البصمات الصالحة بصورتها القانونية. */
  valid: string[];
  /** ما أُدخل وتعذّر فهمه — يُعرض في صفحة الفحص لا في ملف الربط. */
  rejected: string[];
};

export function normalizeFingerprint(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (CANONICAL.test(cleaned)) return cleaned;

  // صيغةٌ بلا فواصل (أو بشرطات): تُقسَّم إلى بايتات.
  const bare = cleaned.replace(/[^0-9A-F]/g, "");
  if (HEX_64.test(bare)) return bare.match(/.{2}/g)!.join(":");

  return null;
}

export function readFingerprints(raw: string | undefined): FingerprintCheck {
  const valid: string[] = [];
  const rejected: string[] = [];

  for (const part of (raw || "").split(",")) {
    if (!part.trim()) continue;
    const normalized = normalizeFingerprint(part);
    if (normalized) valid.push(normalized);
    else rejected.push(part.trim().slice(0, 80));
  }

  return { valid, rejected };
}
