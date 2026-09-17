import type { Metadata } from "next";
import Image from "next/image";
import { ChurchLogo } from "@/components/layout/ChurchLogo";
import { EparchyLogo } from "@/components/layout/EparchyLogo";
import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "./LoginForm";
// صورةُ الكنيسة كما رفعها صاحبُها في جذر المستودع: تُستورد من مكانها ولا
// تُنسخ ولا يُمسّ ملفُها. والاستيراد الساكن يجعل Next يخدمها بمقاساتٍ مناسبة
// لكل شاشة، والأصلُ باقٍ كما هو.
import churchInterior from "../../../كنيسة.jpg";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      {/*
        الخلفية ثابتةٌ خلف كل شيء: الصورة تملأ الشاشة بنسبتها الأصلية
        (`object-cover` لا يمطّها)، وموضعُها مرفوعٌ قليلًا إلى أعلى الوسط لأن
        الهيكل والأيقونسطاس والثُّريّا هناك — فيبقى ما يُعرَف به المكان ظاهرًا
        على شاشة الهاتف الطويلة حيث يُقتطع العرض حتمًا.
      */}
      <div className="fixed inset-0 -z-10">
        <Image
          src={churchInterior}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="animate-fade-in-up object-cover object-[50%_38%]"
          style={{ animationDuration: "0.9s" }}
        />
        {/*
          طبقةٌ داكنة متدرّجة: أغمق عند الطرفين وأخفّ في الوسط حيث الصورة،
          فيقرأ النصُّ الأبيض بلا عناء وتبقى الكنيسة مرئيّة لا مطموسة.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1210]/68 via-[#0d1210]/48 to-[#0d1210]/88" />
      </div>

      <div className="w-full max-w-md flex-1 animate-fade-in-up">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex size-20 items-center justify-center rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-lg)] ring-1 ring-white/20">
            <ChurchLogo className="size-16" />
          </div>
          <h1 className="text-xl font-extrabold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
            خدمة التربية الكنسية
          </h1>
          <p className="mt-1 text-sm text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
            كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-white/15 bg-surface p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:p-8">
          <h2 className="mb-1 text-lg font-bold text-ink">تسجيل الدخول</h2>
          <p className="mb-6 text-sm text-ink-muted">من فضلك أدخل بياناتك للوصول إلى حسابك</p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-white/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          &ldquo;ليس لي فرح أعظم من هذا: أن أسمع عن أولادي أنهم يسلكون بالحق&rdquo; (3يو 1: 4)
        </p>

        <div className="mt-4 flex justify-center">
          <EparchyLogo className="h-14 w-auto opacity-90 brightness-0 invert" />
        </div>
      </div>

      <Footer className="mt-8 w-full max-w-md border-t-0 text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]" />
    </div>
  );
}
