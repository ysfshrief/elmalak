/**
 * Makes a fresh clone runnable: creates .env with a generated AUTH_SECRET
 * (the file is git-ignored, so it never exists after a clone), then applies
 * migrations and seeds the database if it is still empty.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const PLACEHOLDER = "postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public";

function run(command) {
  execSync(command, { cwd: root, stdio: "inherit" });
}

if (!existsSync(envPath)) {
  writeFileSync(
    envPath,
    `DATABASE_URL="${PLACEHOLDER}"\nAUTH_SECRET="${randomBytes(32).toString("hex")}"\n`
  );
  console.log("✓ تم إنشاء ملف .env بمفتاح AUTH_SECRET عشوائي");
}

const env = readFileSync(envPath, "utf8");
const missing = ["DATABASE_URL", "AUTH_SECRET"].filter(
  (key) => !new RegExp(`^${key}=`, "m").test(env)
);
if (missing.length > 0) {
  console.error(`✗ ملف .env ينقصه: ${missing.join(", ")}`);
  process.exit(1);
}

if (env.includes(PLACEHOLDER)) {
  console.error(
    [
      "",
      "✗ لم يتم ضبط DATABASE_URL بعد.",
      "",
      "  المشروع يستخدم PostgreSQL. افتح ملف .env وضع رابط قاعدة بياناتك مكان العنوان المؤقت.",
      "  للتشغيل المحلي بقاعدة بيانات على جهازك:",
      "",
      '    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/elmalak?schema=public"',
      "",
      "  أو استخدم نفس رابط قاعدة البيانات المستضافة المستخدمة في الإنتاج.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

console.log("→ تطبيق ترحيلات قاعدة البيانات...");
run("npx prisma migrate deploy");
run("npx prisma generate");

console.log("→ تعبئة البيانات الأولية (تعمل مرة واحدة فقط على قاعدة بيانات فارغة)...");
run("npx prisma db seed");

console.log("\n✓ جاهز. شغّل التطبيق بـ: npm run dev");
