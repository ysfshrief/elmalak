/**
 * ينسخ ملفات القراءة الضوئية وعارض PDF من node_modules إلى public/.
 *
 * تُستضاف هذه الملفات من الموقع نفسه بدل شبكات التوزيع الخارجية: بيانات
 * المخدومين لا تغادر المتصفّح أثناء القراءة، والميزة تعمل ولو حُجبت تلك
 * الشبكات. وهي ملفات مولَّدة، فلا تُحفظ في المستودع بل تُنسخ عند كل بناء.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "ocr");
mkdirSync(out, { recursive: true });

// النواة تأتي بثلاث نسخ حسب دعم المعالج لتعليمات SIMD، ويختار tesseract.js
// المناسبة وقت التشغيل — فتُنسخ كلها. ونكتفي بنسخ LSTM لأننا لا نستعمل
// المحرّك القديم. ملف ‎.wasm.js‎ يحمل الثنائي بداخله فلا حاجة لملف ‎.wasm‎.
const files = [
  ["tesseract.js/dist/worker.min.js", "tesseract-worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  [
    "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ],
  ["pdfjs-dist/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
];

let copied = 0;
for (const [from, to] of files) {
  const source = join(root, "node_modules", from);
  if (!existsSync(source)) {
    console.error(`✗ ملف مفقود: ${from}`);
    process.exit(1);
  }
  copyFileSync(source, join(out, to));
  copied++;
}

console.log(`→ نُسخت ${copied} من ملفات القراءة الضوئية إلى public/ocr`);
