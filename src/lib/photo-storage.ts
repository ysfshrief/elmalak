import "server-only";

/**
 * خزنة صور المخدومين على Supabase Storage.
 *
 * الحاوية خاصة ولا تُفتح للعموم أبدًا. والمتصفّح لا يتصل بـSupabase إطلاقًا:
 * كل رفع وعرض وحذف يمر من الخادم بالمفتاح السري، فلا يخرج المفتاح من الخادم
 * ولا يعرف المستخدم أين تُحفظ الصورة أصلًا.
 *
 * ونستعمل واجهة التخزين مباشرةً بـ‎fetch‎ بدل حزمة ‎@supabase/supabase-js‎:
 * المطلوب هنا أربع عمليات على ملفات، والحزمة تحمل معها عميل قاعدة بيانات
 * وزمنًا حيًّا لا نستعملهما — وثمنهما بطء بارد في كل دالة بلا خادم.
 */

/** اسم الحاوية. ثابتٌ في الكود لأنه جزء من بنية المشروع لا من أسراره. */
export const PHOTO_BUCKET = process.env.SUPABASE_PHOTO_BUCKET?.trim() || "child-photos";

export class PhotoStorageError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "PhotoStorageError";
  }
}

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export function isPhotoStorageConfigured() {
  return config() !== null;
}

function requireConfig() {
  const settings = config();
  if (!settings) throw new PhotoStorageError("خزنة الصور غير مضبوطة على الخادم");
  return settings;
}

/** ترويسات الطلب. المفتاح السري لا يُسجَّل ولا يُعاد في أي رد. */
function authHeaders(key: string, extra?: Record<string, string>) {
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
}

/* ————————————————————————— مسار الملف ————————————————————————— */

/**
 * مسار الصورة كما يُحفظ في قاعدة البيانات: `child-photos/<معرّف المخدوم>/<اسم>`.
 *
 * وجود معرّف المخدوم داخل المسار ليس ترتيبًا للعرض فقط: هو تحقّقٌ إضافي، إذ
 * يُرفض عند القراءة أي مسار محفوظ لا يطابق المخدوم المطلوب.
 */
export function buildPhotoPath(childId: string, extension: string) {
  return `${PHOTO_BUCKET}/${childId}/${crypto.randomUUID()}.${extension}`;
}

/**
 * يفكّ المسار المحفوظ إلى حاوية وملف، ويرفض ما لا يخصّ هذا المخدوم أو ما
 * يشير إلى حاوية أخرى — فسطرٌ في قاعدة البيانات عُبث به لا يقرأ ملفًا غريبًا.
 */
function splitPhotoPath(stored: string, childId: string) {
  const [bucket, owner, ...rest] = stored.split("/");
  const objectPath = rest.join("/");

  if (bucket !== PHOTO_BUCKET || owner !== childId || !objectPath || objectPath.includes("..")) {
    throw new PhotoStorageError("مسار الصورة غير صالح");
  }
  return { bucket, objectPath: `${owner}/${objectPath}` };
}

/* ————————————————————————— العمليات ————————————————————————— */

/** يرفع صورة ويعيد مسارها المحفوظ. */
export async function uploadPhoto(
  childId: string,
  bytes: ArrayBuffer,
  mimeType: string,
  extension: string
): Promise<string> {
  const { url, key } = requireConfig();
  const stored = buildPhotoPath(childId, extension);
  const { bucket, objectPath } = splitPhotoPath(stored, childId);

  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`,
    {
      method: "POST",
      headers: authHeaders(key, {
        "Content-Type": mimeType,
        "Cache-Control": "3600",
        // الاسم عشوائي فلا يتكرّر؛ والرفض عند التكرار أسلم من الكتابة فوقه.
        "x-upsert": "false",
      }),
      body: bytes,
    }
  );

  if (!response.ok) throw new PhotoStorageError(storageMessage(response.status), response.status);
  return stored;
}

/** يجلب صورة للعرض. يعيد المجرى كما هو فلا تُحمَّل الصورة في ذاكرة الخادم. */
export async function downloadPhoto(stored: string, childId: string) {
  const { url, key } = requireConfig();
  const { bucket, objectPath } = splitPhotoPath(stored, childId);

  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`,
    { headers: authHeaders(key) }
  );

  if (!response.ok || !response.body) {
    throw new PhotoStorageError(storageMessage(response.status), response.status);
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    contentLength: response.headers.get("content-length"),
  };
}

/**
 * يحذف صورة. الحذف تنظيفٌ لا أكثر: فشله لا يُفسد بيانات المخدوم، فيُبلَّغ
 * عنه بقيمة راجعة بدل أن يُسقط العملية كلها.
 */
export async function deletePhoto(stored: string, childId: string): Promise<boolean> {
  try {
    const { url, key } = requireConfig();
    const { bucket, objectPath } = splitPhotoPath(stored, childId);

    const response = await fetch(
      `${url}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`,
      { method: "DELETE", headers: authHeaders(key) }
    );
    // ٤٠٤ يعني أنها محذوفة أصلًا — وهي الغاية.
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * فحص تهيئة الخزنة: المفتاح، ووجود الحاوية، وأنها ما تزال خاصة.
 *
 * الفحص الأخير مقصود: حاوية صور المخدومين إن صارت عامة يومًا انكشفت الصور
 * كلها لمن يعرف الرابط، وهو تغيير يتم بضغطة في لوحة Supabase لا أثر له في
 * الكود. فيُكشف هنا بدل أن يمرّ صامتًا.
 */
export async function checkPhotoStorage(): Promise<
  { ok: true; bucket: string; note?: string } | { ok: false; reason: string }
> {
  const settings = config();
  if (!settings) return { ok: false, reason: "متغيّرات خزنة الصور غير مضبوطة على الخادم" };

  try {
    const response = await fetch(`${settings.url}/storage/v1/bucket/${PHOTO_BUCKET}`, {
      headers: authHeaders(settings.key),
    });
    if (response.status === 404) {
      return { ok: false, reason: `الحاوية «${PHOTO_BUCKET}» غير موجودة في المشروع` };
    }
    if (!response.ok) return { ok: false, reason: storageMessage(response.status) };

    const bucket = (await response.json()) as { name?: string; public?: boolean };
    if (bucket.public) {
      return {
        ok: false,
        reason: `الحاوية «${PHOTO_BUCKET}» عامّة — صور المخدومين بيانات خاصة، اجعلها Private`,
      };
    }
    return { ok: true, bucket: bucket.name ?? PHOTO_BUCKET };
  } catch {
    return { ok: false, reason: "تعذّر الاتصال بخزنة الصور" };
  }
}

/** ترميز كل جزء من المسار على حدة — الشرطة المائلة فاصل مجلّدات لا حرف اسم. */
function encodeObjectPath(objectPath: string) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

/** رسائل عربية مفهومة، بلا أي شيء من رد الخزنة قد يحمل سرًّا. */
function storageMessage(status: number) {
  if (status === 401 || status === 403) return "خزنة الصور رفضت الطلب — راجع مفتاح الخادم";
  if (status === 404) return "الصورة غير موجودة في خزنة الصور";
  if (status === 409) return "اسم الملف مستعمل — أعد المحاولة";
  if (status === 413) return "حجم الصورة أكبر مما تقبله الخزنة";
  if (status === 429) return "خزنة الصور مشغولة — حاول بعد قليل";
  if (status >= 500) return "خزنة الصور غير متاحة حاليًا — حاول بعد قليل";
  return "تعذّر الاتصال بخزنة الصور";
}
