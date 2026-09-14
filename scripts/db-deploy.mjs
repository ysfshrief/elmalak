/**
 * يطبّق الترحيلات ثم التهيئة الأولية قبل البناء.
 *
 * ترحيلات Prisma تأخذ قفلًا على مستوى الجلسة (pg_advisory_lock)، وهذا لا
 * يعمل عبر اتصال Neon المُجمَّع (pooler) فينتهي بمهلة P1002. لذلك تُنفَّذ
 * الترحيلات على الاتصال المباشر، بينما يظل التطبيق وقت التشغيل على
 * الاتصال المُجمَّع (الأنسب للبيئات بلا خادم).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// محليًا تأتي المتغيّرات من .env، وفي الإنتاج من المنصّة — فلا نطغى عليها.
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, "$1");
  }
}

function directDatabaseUrl() {
  // تكامل Neon مع Vercel يوفّر الاتصال المباشر تحت أحد هذه الأسماء.
  const explicit =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DIRECT_URL;
  if (explicit) return explicit;

  // وإلا: اشتقّه من الرابط المُجمَّع بإزالة لاحقة "-pooler" من اسم المضيف.
  const url = process.env.DATABASE_URL;
  if (url?.includes("-pooler.")) return url.replace("-pooler.", ".");

  return url;
}

function run(command, env) {
  execSync(command, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

const direct = directDatabaseUrl();
if (!direct) {
  console.error("✗ متغيّر DATABASE_URL غير مضبوط.");
  process.exit(1);
}

const viaPooler = direct !== process.env.DATABASE_URL;
console.log(`→ تطبيق الترحيلات عبر الاتصال ${viaPooler ? "المباشر" : "الحالي"}...`);
run("npx prisma migrate deploy", { DATABASE_URL: direct });

console.log("→ التهيئة الأولية (تعمل مرة واحدة على قاعدة بيانات فارغة)...");
run("npx prisma db seed", { DATABASE_URL: direct });
