import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Toaster } from "sonner";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "خدمة التربية الكنسية",
    template: "%s | خدمة التربية الكنسية",
  },
  description:
    "منصة إدارة خدمة التربية الكنسية — كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور",
  // يجعل الموقع قابلًا للتثبيت، ويقرأه تطبيق أندرويد ليعرف اسمه وأيقونته.
  manifest: "/manifest.webmanifest",
  applicationName: "خدمة الملاك",
  appleWebApp: { capable: true, title: "خدمة الملاك", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#14181a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink antialiased">
        <ConnectionStatus />
        {children}
        <Toaster
          position="top-center"
          dir="rtl"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-arabic)",
              borderRadius: "var(--radius-md)",
            },
          }}
        />
      </body>
    </html>
  );
}
