/**
 * Vector recreation of the church's badge logo (shape, Arabic text and gold
 * palette reproduced from the source image; the center devotional icon is
 * simplified rather than redrawn — see README "الهوية البصرية").
 */
export function ChurchLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed-size local SVG, no responsive/optimization benefit from next/image
    <img src="/logos/church-logo.svg" alt="شعار كنيسة رئيس الملائكة الجليل ميخائيل بدمنهور" className={className} />
  );
}
