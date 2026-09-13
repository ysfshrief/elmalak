/**
 * Placeholder mark (generic Coptic cross monogram) used until the real
 * church and eparchy logo files are supplied — see README "الهوية البصرية".
 */
export function CopticCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M24 8v32M12 16h24M16 12v8M32 12v8M16 28v8M32 28v8"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="24" cy="20" r="2.25" fill="currentColor" />
    </svg>
  );
}
