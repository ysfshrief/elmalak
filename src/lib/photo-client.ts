/**
 * تجهيز صورة المخدوم ورفعها — في المتصفّح.
 *
 * الرفع بـ‎XMLHttpRequest‎ لا بـ‎fetch‎ لسبب واحد: هو الطريق الوحيد في
 * المتصفّح لمعرفة كم بايتًا خرج فعلًا (‎upload.onprogress‎). و‎fetch‎ لا
 * يعطي تقدّم الإرسال، فكان البديل شريطًا متحرّكًا لا يعني شيئًا.
 */
import {
  MAX_UPLOAD_BYTES,
  PHOTO_MAX_DIMENSION,
  PHOTO_QUALITY,
  isAllowedPhotoType,
} from "@/lib/photo";

/** صورة أصغر من هذا الحدّ وضمن الأبعاد تُرفع كما هي بلا إعادة ترميز. */
const KEEP_ORIGINAL_UNDER = 900 * 1024;

export type PreparedPhoto = { blob: Blob; type: string; width: number; height: number };

/**
 * يصغّر الصورة مرة واحدة من الأصل إن لزم.
 *
 * الصورة الصغيرة أصلًا لا تُمسّ، فلا تخسر جودةً بإعادة ترميز لا داعي لها.
 * والكبيرة تُصغَّر إلى حدٍّ يكفي للعرض بوضوح ويُبقي الرفع سريعًا على الهاتف.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("تعذّرت قراءة الصورة — جرّب صورة أخرى");
  });

  const largest = Math.max(bitmap.width, bitmap.height);
  const withinSize = file.size <= KEEP_ORIGINAL_UNDER && largest <= PHOTO_MAX_DIMENSION;

  if (withinSize && isAllowedPhotoType(file.type)) {
    const result = { blob: file, type: file.type, width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  }

  const scale = Math.min(1, PHOTO_MAX_DIMENSION / largest);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("المتصفّح لا يدعم معالجة الصور");
  }

  // خلفية بيضاء قبل الرسم: الصور الشفافة (PNG) تصير سوداء بدونها في JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // JPEG أنسب ترميز لصور الوجوه حجمًا وجودة. وإن بقي الملف كبيرًا رغم
  // التصغير — صورة شديدة التفاصيل — تُخفَّض الجودة خطوة خطوة لا دفعة واحدة.
  for (const quality of [PHOTO_QUALITY, 0.75, 0.65, 0.55]) {
    const blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob.size <= MAX_UPLOAD_BYTES) return { blob, type: "image/jpeg", width, height };
  }
  throw new Error("تعذّر تصغير الصورة بما يكفي — جرّب صورة أخرى");
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("تعذّر تجهيز الصورة"))),
      type,
      quality
    );
  });
}

export type UploadHandle = { promise: Promise<string>; abort: () => void };

/**
 * يرفع الصورة ويعيد «نسخة» الصورة الجديدة (تُستعمل في رابط العرض).
 * `onProgress` يتلقّى نسبة ما خرج فعلًا من الجهاز، من صفر إلى واحد.
 */
export function uploadChildPhoto(
  childId: string,
  prepared: PreparedPhoto,
  onProgress: (ratio: number) => void
): UploadHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<string>((resolve, reject) => {
    xhr.open("POST", `/api/children/${encodeURIComponent(childId)}/photo`);
    xhr.setRequestHeader("Content-Type", prepared.type);
    xhr.responseType = "json";
    // الرفع من هاتف على شبكة ضعيفة يحتاج وقتًا، لكن لا يُترك بلا نهاية.
    xhr.timeout = 120_000;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });

    xhr.addEventListener("load", () => {
      const body = xhr.response as { ok?: boolean; version?: string; error?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.version) {
        onProgress(1);
        resolve(body.version);
      } else {
        reject(new Error(body?.error ?? "تعذّر حفظ الصورة"));
      }
    });
    xhr.addEventListener("error", () =>
      reject(new Error("انقطع الاتصال أثناء الرفع — تحقّق من الإنترنت وأعد المحاولة"))
    );
    xhr.addEventListener("timeout", () =>
      reject(new Error("استغرق الرفع وقتًا طويلًا — أعد المحاولة"))
    );
    xhr.addEventListener("abort", () => reject(new Error("أُلغي الرفع")));

    xhr.send(prepared.blob);
  });

  return { promise, abort: () => xhr.abort() };
}

export async function deleteChildPhoto(childId: string) {
  const response = await fetch(`/api/children/${encodeURIComponent(childId)}/photo`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "تعذّر حذف الصورة");
  }
}

/** رابط عرض الصورة. «النسخة» تجعل المتصفّح يخزّنها ويحدّثها عند تغييرها. */
export function childPhotoUrl(childId: string, version: string) {
  return `/api/children/${encodeURIComponent(childId)}/photo?v=${encodeURIComponent(version)}`;
}
