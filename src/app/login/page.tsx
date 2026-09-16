import type { Metadata } from "next";
import { ChurchLogo } from "@/components/layout/ChurchLogo";
import { EparchyLogo } from "@/components/layout/EparchyLogo";
import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-alt coptic-pattern px-4 py-10">
      <div className="w-full max-w-md flex-1 animate-fade-in-up">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex size-20 items-center justify-center rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-md)]">
            <ChurchLogo className="size-16" />
          </div>
          <h1 className="text-xl font-extrabold text-ink">خدمة التربية الكنسية</h1>
          <p className="mt-1 text-sm text-ink-muted">كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور</p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <h2 className="mb-1 text-lg font-bold text-ink">تسجيل الدخول</h2>
          <p className="mb-6 text-sm text-ink-muted">من فضلك أدخل بياناتك للوصول إلى حسابك</p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          &ldquo;ليس لي فرح أعظم من هذا: أن أسمع عن أولادي أنهم يسلكون بالحق&rdquo; (3يو 1: 4)
        </p>

        <div className="mt-4 flex justify-center">
          <EparchyLogo className="h-14 w-auto opacity-80" />
        </div>
      </div>

      <Footer className="mt-8 w-full max-w-md border-t-0" />
    </div>
  );
}
