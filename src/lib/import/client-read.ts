/**
 * قراءة ملفات PDF والصور — داخل المتصفّح.
 *
 * ملف PDF الذي يحمل طبقة نص (مُصدَّر من Word مثلًا) يُقرأ نصًّا فيكون دقيقًا.
 * وما لا يحمل نصًا — أي المصوَّر والممسوح ضوئيًا — يُقرأ ضوئيًا (OCR).
 *
 * والقراءتان كلتاهما على جهاز المستخدم لا على الخادم، لثلاثة أسباب: كشف
 * المخدومين لا يغادر جهاز صاحبه، والملفات المصوَّرة تتجاوز حدّ حجم الطلب في
 * النشر بلا خادم، وقراءة صفحة ضوئيًا تستغرق عشرات الثواني فتتجاوز مهلة
 * الدوال. ملفات المحرّك تُستضاف من الموقع نفسه (‎public/ocr‎) لا من شبكة
 * توزيع خارجية.
 *
 * دقّة القراءة الضوئية للعربية ليست مضمونة — لذلك تمر النتيجة دائمًا على
 * جدول المراجعة قبل الحفظ، ولا يُحفظ من ورائه سطر.
 */
import { itemsToTable, linesToTable, type LayoutItem } from "./layout";

export type OcrProgress = { message: string; ratio: number };

/**
 * عرض الصفحة بالبكسل عند تحويلها إلى صورة — يوازي مسحًا بدقّة ٣٠٠ نقطة في
 * البوصة لصفحة A4. الدقّة هنا ليست ترفًا: عند ٢٠٠٠ بكسل خرجت أرقام
 * التليفونات وتواريخ الميلاد مشوّهة تمامًا، وعند هذا الحدّ خرجت صحيحة.
 */
const RENDER_WIDTH = 2480;
const MAX_PAGES = 20;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** أقل عدد أحرف يدل على طبقة نص حقيقية لا مجرّد ترويسة فوق صورة. */
const PDF_TEXT_THRESHOLD = 40;

/**
 * يقرأ ملف PDF أو صورة ويعيد جدولًا مقترحًا، مع بيان الطريقة المستعملة.
 * ملفات PDF تُجرَّب نصًّا أولًا لأنها أدقّ بما لا يُقاس، ثم ضوئيًا عند الحاجة.
 */
export async function readFileInBrowser(
  file: File,
  onProgress: (progress: OcrProgress) => void
): Promise<{ table: string[][]; source: string; usedOcr: boolean }> {
  if (isPdfFile(file)) {
    onProgress({ message: "فحص الملف…", ratio: 0.02 });
    const fromText = await readPdfTextLayer(file);
    if (fromText) return { ...fromText, usedOcr: false };
  }
  const scanned = await readScannedFile(file, onProgress);
  return { ...scanned, usedOcr: true };
}

/**
 * يستخرج جدولًا من طبقة النص في ملف PDF. يعيد `null` إن كان الملف صورة،
 * فينتقل النداء إلى القراءة الضوئية.
 */
async function readPdfTextLayer(
  file: File
): Promise<{ table: string[][]; source: string } | null> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;

  const table: string[][] = [];
  let characters = 0;

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      const items: LayoutItem[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || !raw.str.trim()) continue;
        characters += raw.str.trim().length;
        // transform = [a, b, c, d, e, f]، و(e, f) الأصل في نظام PDF الذي
        // يبدأ من أسفل الصفحة — فيُقلب ليوافق اتجاه القراءة من أعلى.
        const [, , , , x, y] = raw.transform;
        const height = raw.height || Math.abs(raw.transform[3]) || 10;
        items.push({ text: raw.str, x, y: viewport.height - y - height, width: raw.width, height });
      }

      for (const row of itemsToTable(items)) table.push(row);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  if (characters < PDF_TEXT_THRESHOLD || table.length === 0) return null;
  return { table, source: "PDF — طبقة نص" };
}

/** يقرأ ملفًا مصوَّرًا (PDF ممسوح أو صورة) ضوئيًا ويعيد جدولًا مقترحًا. */
async function readScannedFile(
  file: File,
  onProgress: (progress: OcrProgress) => void
): Promise<{ table: string[][]; source: string }> {
  const canvases = isPdfFile(file)
    ? await renderPdfPages(file, onProgress)
    : [await loadImageToCanvas(file)];

  if (canvases.length === 0) throw new Error("لم يُعثر على صفحات في الملف");

  const { createWorker, PSM } = await import("tesseract.js");

  onProgress({ message: "تحميل محرّك القراءة (مرة واحدة)…", ratio: 0.1 });
  // ترتيب اللغتين ليس تفصيلًا: النموذج العربي وحده يقرأ الأسماء جيدًا لكنه
  // يشوّه الأرقام اللاتينية (تواريخ الميلاد والتليفونات)، و«ara+eng» أسقط
  // عمود الأسماء كاملًا في الاختبار. «eng+ara» وحده أخرج الأعمدة كلها
  // والأرقام صحيحة — فهذا ما نستعمله.
  const worker = await createWorker("eng+ara", 1, {
    workerPath: "/ocr/tesseract-worker.min.js",
    corePath: "/ocr/",
    langPath: "/ocr",
    // ملفنا غير مضغوط؛ المحرّك يكتشف الضغط من محتوى الملف على أي حال.
    gzip: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "loading language traineddata" || m.status === "initializing tesseract") {
        onProgress({
          message: "تحميل محرّك القراءة (مرة واحدة)…",
          ratio: 0.1 + m.progress * 0.15,
        });
      }
    },
  });

  await worker.setParameters({
    // الكشف صفحة مستندٍ كاملة لا سطرًا مفردًا.
    tessedit_pageseg_mode: PSM.AUTO,
    // الصور المرسومة لا تحمل بيانات دقّة، فنعلنها بدل أن يخمّنها المحرّك.
    user_defined_dpi: "300",
  });

  const items: LayoutItem[] = [];
  const texts: string[] = [];
  let offsetY = 0;

  try {
    for (const [index, canvas] of canvases.entries()) {
      onProgress({
        message: `قراءة الصفحة ${index + 1} من ${canvases.length}…`,
        ratio: 0.25 + (index / canvases.length) * 0.7,
      });

      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
      texts.push(data.text ?? "");

      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs ?? []) {
          for (const line of paragraph.lines ?? []) {
            for (const word of line.words ?? []) {
              if (!word.text.trim()) continue;
              // الكلمات المتهالكة تشوّش أكثر مما تفيد؛ وما فوق ذلك يُعرض
              // للمراجعة — فإسقاط اسم مخدوم أسوأ من عرضه ليُصحَّح.
              if (word.confidence < 20) continue;
              const { x0, y0, x1, y1 } = word.bbox;
              items.push({
                text: word.text,
                x: x0,
                // الصفحات تُكدَّس رأسيًا لتُقرأ كجدول واحد متصل.
                y: y0 + offsetY,
                width: x1 - x0,
                height: y1 - y0,
              });
            }
          }
        }
      }
      offsetY += canvas.height;
      // تحرير ذاكرة الصورة فورًا — صفحات كثيرة بدقّة عالية تُثقل الهاتف.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }

  onProgress({ message: "ترتيب البيانات…", ratio: 0.97 });

  const table = itemsToTable(items);
  // لو لم يتكوّن جدول ذو أعمدة، فالكشف على الأرجح قائمة أسطر.
  if (table.length > 1 && table[0].length >= 3) {
    return { table, source: `قراءة ضوئية — ${canvases.length} صفحة` };
  }
  const fromLines = linesToTable(texts.join("\n"));
  if (fromLines.length === 0) throw new Error("لم يُقرأ نص مفهوم من الملف");
  return { table: fromLines, source: `قراءة ضوئية — أسطر (${canvases.length} صفحة)` };
}

/* ————————————————————————— تحويل الصفحات إلى صور ————————————————————————— */

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/ocr/pdf.worker.min.mjs";
  return pdfjs;
}

async function renderPdfPages(
  file: File,
  onProgress: (progress: OcrProgress) => void
): Promise<HTMLCanvasElement[]> {
  const pdfjs = await loadPdfjs();

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;

  const pages = Math.min(doc.numPages, MAX_PAGES);
  const canvases: HTMLCanvasElement[] = [];

  for (let p = 1; p <= pages; p++) {
    onProgress({ message: `تجهيز الصفحة ${p} من ${pages}…`, ratio: (p / pages) * 0.1 });
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("المتصفّح لا يدعم رسم الصفحات");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvas, viewport }).promise;
    page.cleanup();
    canvases.push(canvas);
  }

  await task.destroy();
  return canvases;
}

async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width < RENDER_WIDTH ? RENDER_WIDTH / bitmap.width : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("المتصفّح لا يدعم معالجة الصور");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}
