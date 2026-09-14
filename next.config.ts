import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // قارئا Excel و Word يعتمدان على وحدات Node، فيُتركان خارج حزمة البناء.
  serverExternalPackages: ["exceljs", "mammoth"],
  experimental: {
    // ملفات الكشوف المكتبية أكبر من الحدّ الافتراضي (١ ميجابايت).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
