import Image from "next/image";

/** The church's own badge logo, background removed (source in assets/logos/). */
export function ChurchLogo({ className, size = 128 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/logos/church-logo.png"
      alt="شعار كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
