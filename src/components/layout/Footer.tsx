import { cn } from "@/lib/utils";

/**
 * تذييل ثابت في كل صفحات الموقع.
 *
 * سطر الحقوق عربي، وسطر المطوّر إنجليزي، فيُلزَم كلٌّ باتجاهه صراحةً: سطرٌ
 * إنجليزي داخل صفحة عربية ينقلب أوله وآخره إن تُرك لاتجاه الصفحة.
 */
export function Footer({ className }: { className?: string }) {
  return (
    <footer
      // ‎cn‎ لا الدمجُ النصّي: صفحةٌ بخلفيةٍ داكنة تحتاج لونًا آخر للنصّ، والصنفان
      // المتعارضان يُحسمان بترتيب ورقة الأنماط لا بترتيب كتابتهما.
      className={cn(
        "border-t border-border px-4 py-5 text-center text-xs leading-relaxed text-ink-faint",
        className
      )}
    >
      <p>© جميع الحقوق محفوظة لكنيسة رئيس الملائكة الجليل ميخائيل بدمنهور</p>
      <p className="mt-1" dir="ltr">
        Developed &amp; designed by: Youssef Shrief
      </p>
    </footer>
  );
}
