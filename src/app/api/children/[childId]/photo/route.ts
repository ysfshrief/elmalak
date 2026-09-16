import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { assertChildAccess } from "@/lib/scope";
import {
  uploadPhoto,
  downloadPhoto,
  deletePhoto,
  isPhotoStorageConfigured,
  PhotoStorageError,
} from "@/lib/drive";
import {
  MAX_UPLOAD_BYTES,
  extensionForType,
  isAllowedPhotoType,
  sniffImageType,
} from "@/lib/photo";

/**
 * صورة المخدوم: رفعًا وعرضًا وحذفًا.
 *
 * كل شيء يمرّ من هنا. المتصفّح لا يعرف عن الخزنة الخارجية شيئًا، ولا يرسل
 * إليها ولا يستقبل منها. والصلاحية تُقرأ من نطاق المستخدم نفسه الذي يحكم
 * باقي المشروع (‎assertChildAccess‎)، فلا قاعدة أذونات ثانية تُنسى.
 *
 * ومعرّف الملف في الخزنة لا يُقبل من المتصفّح أبدًا — يُقرأ من قاعدة
 * البيانات بعد التحقق من الصلاحية، وإلا لأمكن لمستخدمٍ أن يطلب صورة مخدوم
 * ليس في نطاقه بتمرير معرّف ملف عشوائي.
 */

// رفع صورة وإرسالها إلى الخزنة أبطأ من طلب عادي، والمهلة الافتراضية ضيّقة.
export const maxDuration = 30;

type Params = { params: Promise<{ childId: string }> };

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** يحوّل أخطاء الصلاحية والخزنة إلى ردود واضحة بلا تسريب تفاصيل داخلية. */
function errorResponse(error: unknown) {
  if (error instanceof PhotoStorageError) {
    const status = error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
    return json({ error: error.message }, status);
  }
  if (error instanceof Error && error.message.includes("صلاحية")) {
    return json({ error: error.message }, 403);
  }
  return json({ error: "تعذّر تنفيذ العملية" }, 500);
}

/** يتحقق من الدخول والصلاحية على المخدوم، ويعيد سجله. */
async function authorize(childId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: "انتهت الجلسة — سجّل الدخول مرة أخرى" }, 401) };

  await assertChildAccess(user, childId);

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, fullName: true, photoFileId: true },
  });
  if (!child) return { error: json({ error: "المخدوم غير موجود" }, 404) };

  return { child };
}

/* ————————————————————————— الرفع ————————————————————————— */

export async function POST(request: Request, { params }: Params) {
  const { childId } = await params;

  try {
    if (!isPhotoStorageConfigured()) {
      return json({ error: "خزنة الصور غير مضبوطة على الخادم" }, 503);
    }

    const authorized = await authorize(childId);
    if (authorized.error) return authorized.error;
    const { child } = authorized;

    const declared = (request.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!isAllowedPhotoType(declared)) {
      return json({ error: "نوع الصورة غير مدعوم — استخدم JPG أو PNG أو WEBP" }, 415);
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_UPLOAD_BYTES) {
      return json({ error: "حجم الصورة كبير جدًا" }, 413);
    }

    const buffer = await request.arrayBuffer();
    if (buffer.byteLength === 0) return json({ error: "لم تصل أي بيانات" }, 400);
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return json({ error: "حجم الصورة كبير جدًا" }, 413);
    }

    // الترويسة يكتبها المرسِل؛ التوقيع من الملف نفسه.
    const sniffed = sniffImageType(new Uint8Array(buffer.slice(0, 16)));
    if (!sniffed || sniffed !== declared) {
      return json({ error: "الملف ليس صورة صالحة" }, 415);
    }

    const previous = child.photoFileId;
    const name = `${child.id}-${Date.now()}.${extensionForType(sniffed)}`;

    // ١. تُرفع الجديدة أولًا: لو فشلت، لم يتغيّر شيء والقديمة في مكانها.
    const fileId = await uploadPhoto(buffer, sniffed, name);

    // ٢. ثم يُحدَّث السجل. ولو فشل، تُحذف الجديدة فلا تبقى صورةً يتيمة.
    try {
      await prisma.child.update({ where: { id: child.id }, data: { photoFileId: fileId } });
    } catch (error) {
      await deletePhoto(fileId);
      throw error;
    }

    // ٣. وأخيرًا تُحذف القديمة. فشلُ التنظيف لا يُفسد شيئًا، فلا يُسقط الطلب.
    if (previous && previous !== fileId) await deletePhoto(previous);

    return json({ ok: true, version: fileId }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/* ————————————————————————— العرض ————————————————————————— */

export async function GET(request: Request, { params }: Params) {
  const { childId } = await params;

  try {
    const authorized = await authorize(childId);
    if (authorized.error) return authorized.error;
    const { child } = authorized;

    if (!child.photoFileId) return json({ error: "لا توجد صورة" }, 404);

    // العميل الذي يطلب النسخة الحالية بالاسم يأمن تغيّرها، فتُخزَّن عنده
    // إلى الأبد؛ وغيره يسأل في كل مرة. وهكذا لا تُجلب صورة مرتين بلا داعٍ
    // ولا تظهر صورة قديمة بعد تغييرها.
    const requested = new URL(request.url).searchParams.get("v");
    const fresh = requested === child.photoFileId;

    const file = await downloadPhoto(child.photoFileId);
    const contentType = isAllowedPhotoType(file.contentType)
      ? file.contentType
      : "application/octet-stream";

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      ETag: `"${child.photoFileId}"`,
      // صور المخدومين بيانات خاصة: تُخزَّن في متصفّح صاحب الجلسة وحده.
      "Cache-Control": fresh
        ? "private, max-age=31536000, immutable"
        : "private, max-age=0, must-revalidate",
    });
    if (file.contentLength) headers.set("Content-Length", file.contentLength);

    return new Response(file.body, { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
}

/* ————————————————————————— الحذف ————————————————————————— */

export async function DELETE(_request: Request, { params }: Params) {
  const { childId } = await params;

  try {
    const authorized = await authorize(childId);
    if (authorized.error) return authorized.error;
    const { child } = authorized;

    if (!child.photoFileId) return json({ ok: true }, 200);

    // يُفرَّغ السجل أولًا: لو فشل الحذف من الخزنة بقي ملفٌ زائد لا أكثر،
    // أمّا العكس فيترك سجلًا يشير إلى صورة غير موجودة.
    await prisma.child.update({ where: { id: child.id }, data: { photoFileId: null } });
    await deletePhoto(child.photoFileId);

    return json({ ok: true }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
