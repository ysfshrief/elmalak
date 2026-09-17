/**
 * يشتقّ أيقونات الويب وأندرويد من شعار الكنيسة الأصلي.
 *
 * لا يُعاد رسم الشعار ولا يُعدَّل: يُقرأ `public/logos/church-logo.png` كما هو،
 * ويُصغَّر ويُوسَّط على خلفية من ألوان الهوية. والتصغير والتوسيط هما ما يفعله
 * أي خطّ إنتاج أيقونات — أمّا الشكل نفسه فيبقى كما رسمه أصحابه.
 *
 * وأيقونة أندرويد التكيّفية تُقصّ دائرةً من مربّعها، فيُترك للشعار هامشٌ
 * كافٍ (النواة الآمنة ≈ ٦٦٪ من الضلع) وإلا قُصّت أطرافُه.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "public/logos/church-logo.png");
const CREAM = { r: 0xfa, g: 0xf7, b: 0xef, alpha: 1 };

async function badge({ size, inset, background, out }) {
  const inner = Math.round(size * inset);
  const logo = await sharp(SOURCE).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const offset = Math.round((size - inner) / 2);
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  await mkdir(path.dirname(out), { recursive: true });
  await canvas.composite([{ input: logo, top: offset, left: offset }]).png().toFile(out);
  return out;
}

const made = [];

// ① أيقونات الويب (PWA)
for (const size of [192, 512]) {
  // «any»: الشعار كما هو بهامشٍ صغير وخلفية شفافة.
  made.push(await badge({ size, inset: 0.96, out: `public/icons/icon-${size}.png` }));
  // «maskable»: هامشٌ واسع وخلفية مصمتة، فأيّ قناعٍ يقصّه لا يقصّ الشعار.
  made.push(await badge({ size, inset: 0.62, background: CREAM, out: `public/icons/maskable-${size}.png` }));
}
made.push(await badge({ size: 180, inset: 0.9, background: CREAM, out: "public/icons/apple-touch-icon.png" }));

// ② أيقونات مشغّل أندرويد
const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(DENSITIES)) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  made.push(await badge({ size, inset: 0.86, background: CREAM, out: `${dir}/ic_launcher.png` }));
  made.push(await badge({ size, inset: 0.86, background: CREAM, out: `${dir}/ic_launcher_round.png` }));
  // الطبقة الأمامية للأيقونة التكيّفية: الشعار داخل النواة الآمنة.
  made.push(await badge({ size: Math.round(size * 1.5), inset: 0.62, out: `${dir}/ic_launcher_foreground.png` }));
}
// أيقونة شاشة البدء (TWA): مربّع كبير بهامشٍ واسع.
made.push(await badge({ size: 512, inset: 0.66, background: CREAM, out: "android/app/src/main/res/drawable/splash_logo.png" }));
made.push(await badge({ size: 512, inset: 0.62, background: CREAM, out: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_play.png" }));

await writeFile(
  path.join(ROOT, "public/icons/SOURCE.txt"),
  "كل الأيقونات هنا مشتقّة آليًا من public/logos/church-logo.png بالتصغير والتوسيط فقط.\n" +
    "لا تُحرَّر يدويًا — شغّل: npm run icons\n"
);

console.log(`أُنتجت ${made.length} أيقونة من ${path.relative(ROOT, SOURCE)}`);
