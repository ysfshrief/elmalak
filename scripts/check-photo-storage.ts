/**
 * فحص خزنة صور المخدومين فحصًا حقيقيًا: رفعٌ ثم تنزيل ثم حذف.
 *
 *   npm run check:photos
 *
 * الغرض أن يُعرف أن الضبط سليم قبل أن يرفع خادمٌ أول صورة مخدوم، لا بعده.
 * ولا يُطبع أي مفتاح ولا جزء منه.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// المتغيّرات تأتي من البيئة في الإنتاج، ومن .env محليًا.
const envPath = resolve(".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] === undefined) {
      process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, "$1");
    }
  }
}

/** صورة PNG صالحة (١×١) — أصغر ما يُثبت أن الرفع يعمل. */
const SAMPLE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function main() {
  // يُستورد بعد تحميل .env، فالوحدة تقرأ الإعدادات عند أول استعمال.
  const storage = await import("../src/lib/photo-storage");

  if (!storage.isPhotoStorageConfigured()) {
    console.error("✗ SUPABASE_URL أو SUPABASE_SECRET_KEY غير مضبوط.");
    process.exit(1);
  }
  console.log(`→ الحاوية: ${storage.PHOTO_BUCKET}`);

  const health = await storage.checkPhotoStorage();
  if (!health.ok) {
    console.error(`✗ ${health.reason}`);
    process.exit(1);
  }
  console.log(`✓ الحاوية موجودة وخاصة`);

  const childId = `check-${Date.now()}`;
  const bytes = SAMPLE.buffer.slice(
    SAMPLE.byteOffset,
    SAMPLE.byteOffset + SAMPLE.byteLength
  ) as ArrayBuffer;

  const path = await storage.uploadPhoto(childId, bytes, "image/png", "png");
  console.log(`✓ رُفعت صورة اختبار: ${path}`);

  const file = await storage.downloadPhoto(path, childId);
  const downloaded = new Uint8Array(await new Response(file.body).arrayBuffer());
  const identical = downloaded.length === SAMPLE.length;
  console.log(
    `${identical ? "✓" : "✗"} نُزّلت: ${downloaded.length} بايت (${file.contentType})` +
      `${identical ? " — مطابقة للأصل" : " — لا تطابق الأصل!"}`
  );

  console.log(`${(await storage.deletePhoto(path, childId)) ? "✓" : "✗"} حُذفت صورة الاختبار`);
  if (!identical) process.exitCode = 1;
  else console.log("\n✓ خزنة الصور جاهزة.");
}

void main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
