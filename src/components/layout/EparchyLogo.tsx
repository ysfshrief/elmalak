import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The eparchy's mark, background removed (source in assets/logos/).
 * It is pure black ink, so it is inverted to white in dark mode.
 */
export function EparchyLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logos/eparchy-logo.png"
      alt="شعار مطرانية البحيرة وتوابعها للأقباط الأرثوذكس"
      width={400}
      height={302}
      className={cn("eparchy-mark", className)}
    />
  );
}
