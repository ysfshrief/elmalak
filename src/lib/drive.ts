import "server-only";
import { SignJWT, importPKCS8 } from "jose";

/**
 * خزنة صور المخدومين على Google Drive.
 *
 * الصور بيانات خاصة، فالمجلّد يبقى خاصًّا ولا يُشارَك على الإنترنت أبدًا.
 * لا يتصل المتصفّح بـGoogle إطلاقًا: كل رفع وعرض وحذف يمر من الخادم، فلا
 * يخرج المفتاح السري من الخادم ولا يعرف المستخدم أن هناك Drive أصلًا.
 *
 * ونوقّع الطلبات بـ‎jose‎ (وهي أصلًا في المشروع للجلسات) بدل حزمة
 * ‎googleapis‎ الضخمة: المطلوب هنا أربع عمليات فقط، وحزمة بعشرات
 * الميجابايتات في دالة بلا خادم ثمنها بطء بارد في كل طلب.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const SCOPE = "https://www.googleapis.com/auth/drive";

type Credentials =
  | { kind: "oauth"; clientId: string; clientSecret: string; refreshToken: string }
  | { kind: "service_account"; clientEmail: string; privateKey: string };

/**
 * بيانات الاعتماد، بإحدى طريقتين:
 *
 * ١. **حساب مستخدم (OAuth)** — الملفات يملكها صاحب الحساب وتُحسب على مساحته.
 *    وهذه هي الطريقة الوحيدة الممكنة مع مجلّد في Drive شخصي.
 * ٢. **حساب خدمة (Service Account)** — لا يصلح إلا مع «مشغّل مشترك»
 *    (Shared Drive)، لأن حساب الخدمة بلا مساحة تخزين خاصة به، فلا يستطيع
 *    أن يملك ملفًا في Drive شخصي مهما مُنح من صلاحيات على المجلّد.
 *
 * تُقدَّم الأولى عند وجودها لأنها تعمل في الحالتين.
 */
function credentials(): Credentials | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (clientId && clientSecret && refreshToken) {
    return { kind: "oauth", clientId, clientSecret, refreshToken };
  }

  const account = serviceAccount();
  if (account) {
    return {
      kind: "service_account",
      clientEmail: account.client_email,
      privateKey: account.private_key,
    };
  }
  return null;
}

type ServiceAccountJson = { client_email: string; private_key: string };

/**
 * يقرأ حساب الخدمة من متغيّرات البيئة. يُقبل الـJSON كما هو أو مُرمّزًا
 * بـbase64، لأن بعض لوحات النشر تفسد الأسطر الجديدة داخل المفتاح.
 */
function serviceAccount(): ServiceAccountJson | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  let text = raw;
  if (!text.startsWith("{")) {
    try {
      text = Buffer.from(raw, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(text) as Partial<ServiceAccountJson>;
    if (!parsed.client_email || !parsed.private_key) return null;
    // المفتاح المكتوب في متغيّر بيئة يأتي غالبًا بأسطر مهروبة.
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

export function photoFolderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || "";
}

/** هل الخزنة مضبوطة؟ تُستعمل لإخفاء الميزة بدل أن تفشل عند أول استعمال. */
export function isPhotoStorageConfigured() {
  return credentials() !== null && photoFolderId() !== "";
}

/* ————————————————————————— المصادقة ————————————————————————— */

let cached: { token: string; expiresAt: number } | null = null;

/**
 * رمز وصول من Google. يُحتفظ به في الذاكرة حتى قُبيل انتهائه، فلا نوقّع
 * مفتاحًا ونطلب رمزًا جديدًا مع كل صورة.
 */
async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const credential = credentials();
  if (!credential) throw new PhotoStorageError("خزنة الصور غير مضبوطة على الخادم");

  const body =
    credential.kind === "oauth"
      ? new URLSearchParams({
          grant_type: "refresh_token",
          client_id: credential.clientId,
          client_secret: credential.clientSecret,
          refresh_token: credential.refreshToken,
        })
      : new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: await serviceAccountAssertion(credential.clientEmail, credential.privateKey),
        });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    // ٤٠٠ من Google هنا يعني غالبًا رمز تحديث مسحوب أو منتهٍ.
    throw new PhotoStorageError(
      response.status === 400
        ? "بيانات الدخول إلى خزنة الصور لم تعد صالحة — أعد ربط الحساب"
        : "تعذّر الاتصال بخزنة الصور",
      response.status
    );
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new PhotoStorageError("تعذّر الاتصال بخزنة الصور");

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

/** توقيع JWT لحساب الخدمة. لا تُمرَّر تفاصيل الفشل: قد تحمل أجزاءً من المفتاح. */
async function serviceAccountAssertion(clientEmail: string, privateKey: string) {
  try {
    const key = await importPKCS8(privateKey, "RS256");
    return await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(clientEmail)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
  } catch {
    throw new PhotoStorageError("مفتاح خزنة الصور غير صالح");
  }
}

export class PhotoStorageError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "PhotoStorageError";
  }
}

/* ————————————————————————— العمليات ————————————————————————— */

/** يرفع صورة ويعيد معرّفها. الاسم للتصفّح البشري للمجلّد لا أكثر. */
export async function uploadPhoto(
  bytes: ArrayBuffer,
  mimeType: string,
  name: string
): Promise<string> {
  const folder = photoFolderId();
  if (!folder) throw new PhotoStorageError("مجلّد الصور غير محدَّد على الخادم");

  const boundary = `elmalak-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [folder] });
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);

  // جسمٌ واحد متّصل بدل أجزاء متفرّقة: طوله معلوم فيُرسَل بـContent-Length
  // بدل الترميز المقطّع، والصورة في الذاكرة أصلًا فلا تكلفة إضافية.
  const body = new Uint8Array(head.length + bytes.byteLength + tail.length);
  body.set(head, 0);
  body.set(new Uint8Array(bytes), head.length);
  body.set(tail, head.length + bytes.byteLength);

  const response = await fetch(
    `${UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    throw new PhotoStorageError(driveErrorMessage(response.status), response.status);
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new PhotoStorageError("لم تُعِد خزنة الصور معرّفًا للملف");
  return data.id;
}

/** يجلب صورة للعرض. يعيد المجرى كما هو فلا تُحمَّل الصورة في ذاكرة الخادم. */
export async function downloadPhoto(fileId: string) {
  const response = await fetch(
    `${FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${await accessToken()}` } }
  );

  if (!response.ok || !response.body) {
    throw new PhotoStorageError(driveErrorMessage(response.status), response.status);
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
export async function deletePhoto(fileId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${FILES_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
      { method: "DELETE", headers: { Authorization: `Bearer ${await accessToken()}` } }
    );
    // ٤٠٤ يعني أنها محذوفة أصلًا — وهي الغاية.
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * فحص تهيئة الخزنة: المفتاح، والوصول إلى المجلّد، وإمكان الكتابة فيه فعلًا.
 *
 * الفحص الأخير هو المهم: حساب الخدمة قد يقرأ المجلّد ويظهر أن كل شيء سليم،
 * ثم يفشل أول رفع بـ«لا مساحة تخزين لحسابات الخدمة» — لأنه لا يملك مساحة
 * أصلًا، فلا يستطيع أن يملك ملفًا في Drive شخصي مهما مُنح من صلاحيات.
 * فيُكشف ذلك هنا برسالة تقول ما العمل، بدل أن يُكتشف عند أول صورة.
 */
export async function checkPhotoStorage(): Promise<
  { ok: true; folderName: string; mode: string } | { ok: false; reason: string }
> {
  const credential = credentials();
  if (!credential || !photoFolderId()) {
    return { ok: false, reason: "متغيّرات خزنة الصور غير مضبوطة على الخادم" };
  }

  try {
    const response = await fetch(
      `${FILES_URL}/${encodeURIComponent(photoFolderId())}` +
        "?supportsAllDrives=true&fields=name,mimeType,driveId,capabilities(canAddChildren)",
      { headers: { Authorization: `Bearer ${await accessToken()}` } }
    );
    if (!response.ok) return { ok: false, reason: driveErrorMessage(response.status) };

    const folder = (await response.json()) as {
      name?: string;
      mimeType?: string;
      driveId?: string;
      capabilities?: { canAddChildren?: boolean };
    };

    if (folder.mimeType !== "application/vnd.google-apps.folder") {
      return { ok: false, reason: "المعرّف المحدَّد ليس مجلّدًا" };
    }
    if (!folder.capabilities?.canAddChildren) {
      return { ok: false, reason: "لا صلاحية إضافة ملفات في المجلّد — امنح الحساب صلاحية التعديل" };
    }
    if (credential.kind === "service_account" && !folder.driveId) {
      return {
        ok: false,
        reason:
          "المجلّد في Drive شخصي، وحساب الخدمة لا يملك مساحة تخزين فلا يستطيع الرفع إليه. " +
          "استعمل مجلّدًا في «مشغّل مشترك» (Shared Drive)، أو اربط حساب Google بطريقة OAuth.",
      };
    }

    return {
      ok: true,
      folderName: folder.name ?? "",
      mode: credential.kind === "oauth" ? "حساب Google" : "حساب خدمة",
    };
  } catch (error) {
    if (error instanceof PhotoStorageError) return { ok: false, reason: error.message };
    return { ok: false, reason: "تعذّر الفحص" };
  }
}

/** رسائل عربية مفهومة، بلا أي شيء من ردّ Google قد يحمل سرًّا. */
function driveErrorMessage(status: number) {
  if (status === 401 || status === 403) return "خزنة الصور رفضت الطلب — راجع صلاحية المجلّد";
  if (status === 404) return "الصورة غير موجودة في خزنة الصور";
  if (status === 429) return "خزنة الصور مشغولة — حاول بعد قليل";
  if (status >= 500) return "خزنة الصور غير متاحة حاليًا — حاول بعد قليل";
  return "تعذّر الاتصال بخزنة الصور";
}
