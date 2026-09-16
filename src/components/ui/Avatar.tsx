"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

const PALETTE = [
  "bg-primary-soft text-primary-ink",
  "bg-secondary-soft text-secondary-ink",
  "bg-accent-soft text-accent",
  "bg-info-soft text-info",
];

function colorForName(name: string) {
  const code = name.charCodeAt(0) || 0;
  return PALETTE[code % PALETTE.length];
}

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl",
};

export function Avatar({
  name,
  src,
  className,
  size = "md",
}: {
  name: string;
  /** رابط صورة المخدوم إن وُجدت؛ تُستبدل بالحروف الأولى إن تعذّر تحميلها. */
  src?: string | null;
  className?: string;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImage = !!src && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        SIZES[size],
        showImage ? "bg-bg-alt" : colorForName(name),
        className
      )}
      aria-hidden
    >
      {showImage ? (
        // صورة من مسار محمي بالجلسة، فلا تمر على مُحسِّن الصور.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
