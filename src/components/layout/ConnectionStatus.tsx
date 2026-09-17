"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * تسجيلُ عامل الخدمة، وحالةُ الاتصال، وقبولُ التحديث.
 *
 * ثلاثة أشياء يقولها هذا المكوّن للمستخدم:
 *  ١) أنت غير متصل — شريطٌ ظاهر لا يُخفي شيئًا ولا يُغلق نفسه بالخطأ.
 *  ٢) عاد الاتصال — ويُعاد جلبُ الصفحة الحالية، فلا يبقى أمامه ما بَطَل.
 *  ٣) وصلت نسخةٌ أحدث من الموقع — بزرٍّ يضغطه هو، لا بإعادة تحميلٍ مفاجئة
 *     تضيّع ما يكتبه.
 *
 * والتحديث لا يُترك لمزاج المتصفّح: يُسأل عن عامل خدمةٍ جديد عند كل عودةٍ
 * إلى التطبيق وكل عودةٍ للشبكة، فلا تَعلَق نسخةٌ قديمة على جهاز أحد.
 */
/** حالةُ الشبكة تُقرأ من المتصفّح مباشرةً، فلا تُنسخ في حالةٍ قد تتأخّر عنها. */
function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function ConnectionStatus() {
  const router = useRouter();
  const online = React.useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true // الخادم لا يعرف شبكة المتصفّح، فيُفترض الاتصال حتى يقول العميل غيره.
  );
  const [restored, setRestored] = React.useState(false);
  const registration = React.useRef<ServiceWorkerRegistration | null>(null);
  const wasOnline = React.useRef(true);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const promptUpdate = (waiting: ServiceWorker) => {
      toast("وصلت نسخة أحدث من الموقع", {
        id: "sw-update",
        duration: Infinity,
        action: {
          label: "تحديث",
          onClick: () => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            // عند تولّي العامل الجديد تُعاد الصفحة مرةً واحدة فقط.
            navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
              once: true,
            });
          },
        },
      });
    };

    navigator.serviceWorker
      // `updateViaCache: none` يمنع المتصفّح من خدمة نسخةٍ مخزونة من العامل نفسه.
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;
        registration.current = reg;
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) promptUpdate(installing);
          });
        });
      })
      .catch(() => {
        // تسجيلُ العامل رفاهية: الموقع يعمل كاملًا بدونه.
      });

    const checkForUpdate = () => registration.current?.update().catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && checkForUpdate();
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  // عند عودة الشبكة وحدها: يُسأل عن نشرةٍ جديدة، وتُجلب الصفحة المعروضة من
  // جديد لأنها قد تكون نسخةً مخزونة، ويُعلَن ذلك للمستخدم ثوانيَ ثم يُخفى.
  React.useEffect(() => {
    if (wasOnline.current === online) return;
    wasOnline.current = online;
    if (!online) return;

    registration.current?.update().catch(() => {});
    router.refresh();
    const show = requestAnimationFrame(() => setRestored(true));
    const hide = setTimeout(() => setRestored(false), 3000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(hide);
    };
  }, [online, router]);

  const offline = !online;
  if (!offline && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2",
        "text-center text-xs font-bold shadow-[var(--shadow-md)] animate-fade-in-up",
        offline ? "bg-ink text-bg" : "bg-success text-white"
      )}
      style={{ animationDuration: "0.25s" }}
    >
      {offline ? (
        <>
          <WifiOff className="size-4 shrink-0" aria-hidden />
          غير متصل بالإنترنت — تعرض الصفحات المحفوظة
        </>
      ) : (
        <>
          <Wifi className="size-4 shrink-0" aria-hidden />
          عاد الاتصال بالإنترنت
        </>
      )}
    </div>
  );
}
