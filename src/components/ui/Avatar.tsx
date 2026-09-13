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

export function Avatar({ name, className, size = "md" }: { name: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        sizes[size],
        colorForName(name),
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
