"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ImageViewer } from "@/components/domain/ImageViewer";

/**
 * صورة المخدوم داخل قائمة: الضغط عليها يفتحها، والضغط على باقي السطر يفتح
 * صفحته. ولذلك يوقف الزرّ انتشار الحدث — الصورة هنا محتوى يُنظر إليه، لا
 * مجرّد زينة على رابط.
 */
export function PhotoThumb({
  name,
  src,
  size = "md",
}: {
  name: string;
  src: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = React.useState(false);

  if (!src) return <Avatar name={name} size={size} />;

  return (
    <>
      <button
        type="button"
        aria-label={`عرض صورة ${name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="shrink-0 rounded-full transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <Avatar name={name} src={src} size={size} />
      </button>
      {open && <ImageViewer src={src} alt={`صورة ${name}`} onClose={() => setOpen(false)} />}
    </>
  );
}
