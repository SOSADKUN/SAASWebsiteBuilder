export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`servqo-brand ${className}`}>
      <img
        className="servqo-brand-icon"
        src="/brand/servqo-icon.webp"
        width="48"
        height="48"
        alt=""
      />
      <span>SERVQO</span>
    </span>
  );
}
