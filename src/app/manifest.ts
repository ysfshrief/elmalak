import type { MetadataRoute } from "next";

/**
 * بيانُ تطبيق الويب.
 *
 * هو ما يجعل الموقع قابلًا للتثبيت على الهاتف، وهو أيضًا ما يقرأه تطبيقُ
 * أندرويد ليعرف اسمَه وألوانَه وأيقونته. فالمصدر واحد: الموقع.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "خدمة التربية الكنسية — كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور",
    short_name: "خدمة الملاك",
    description: "منصة إدارة خدمة التربية الكنسية: الحضور والافتقاد والمخدومون.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: "#faf7ef",
    theme_color: "#ab8324",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // «maskable» للأيقونة التي يقصّها النظام بقناعٍ دائري أو غيره.
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
