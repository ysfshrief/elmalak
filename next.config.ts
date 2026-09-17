import type { NextConfig } from "next";

// تُطبع هذه القيم داخل الحزمة وقت البناء، فتقول صفحةُ الفحص أيّ نسخةٍ يعرضها
// متصفّح المستخدم فعلًا. ومن دونها يبقى سؤال «هل وصلك التحديث؟» بلا جواب.
const build = {
  APP_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "محلي",
  APP_COMMIT_MSG: (process.env.VERCEL_GIT_COMMIT_MESSAGE || "").split("\n")[0] || "—",
  APP_BUILT_AT: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
};

const nextConfig: NextConfig = {
  env: build,
  async headers() {
    return [
      {
        // عاملُ الخدمة لا يُخزَّن أبدًا: هو نفسه أداةُ التحديث، فلو خُزّن لَعَلِق
        // المستخدمون على نسخةٍ قديمة من الموقع بلا سبيلٍ إلى إخراجهم منها.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // قارئا Excel و Word يعتمدان على وحدات Node، فيُتركان خارج حزمة البناء.
  serverExternalPackages: ["exceljs", "mammoth"],
  experimental: {
    // ملفات الكشوف المكتبية أكبر من الحدّ الافتراضي (١ ميجابايت).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
