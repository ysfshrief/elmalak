"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ImageViewer } from "@/components/domain/ImageViewer";

/** صورة المخدوم في صفحته: تُفتح بالحجم الكامل عند الضغط. */
export function ChildPhotoAvatar({ name, src }: { name: string; src: string | null }) {
  const [open, setOpen] = React.useState(false);

  if (!src) return <Avatar name={name} size="lg" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`عرض صورة ${name} بالحجم الكامل`}
        className="rounded-full transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <Avatar name={name} src={src} size="lg" />
      </button>
      {open && <ImageViewer src={src} alt={`صورة ${name}`} onClose={() => setOpen(false)} />}
    </>
  );
}
