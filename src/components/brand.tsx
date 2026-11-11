export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`servqo-brand ${className}`}>
      <svg
        viewBox="0 0 32 32"
        width="32"
        height="32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="10" fill="currentColor" />
        <path
          d="M9 14a7 7 0 0 1 14 0M7 18h18M12 23h8M16 5v2"
          stroke="var(--brand-symbol-ink, #fff)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>SERVQO</span>
    </span>
  );
}
