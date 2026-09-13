/**
 * Vector recreation of the eparchy's mark (cross + Arabic name reproduced
 * from the source image). The small Coptic-script caption above the cross
 * in the original is omitted here rather than risk a mistranscribed
 * liturgical text — see README "الهوية البصرية".
 */
export function EparchyLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed-size local SVG, no responsive/optimization benefit from next/image
    <img
      src="/logos/eparchy-logo.svg"
      alt="شعار مطرانية البحيرة وتوابعها للأقباط الأرثوذكس"
      className={className}
    />
  );
}
