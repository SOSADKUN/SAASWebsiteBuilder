export function ServqoLoading({
  label = "Getting your workspace ready…",
  fullPage = true,
}: {
  label?: string;
  fullPage?: boolean;
}) {
  const content = (
    <div
      className="servqo-loading-content"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="servqo-loading-logo" aria-hidden="true">
        <img src="/brand/servqo-icon.webp" width="96" height="96" alt="" />
        <span />
      </span>
      <span className="servqo-loading-wordmark">SERVQO</span>
      <p>{label}</p>
    </div>
  );
  return fullPage ? (
    <main className="servqo-loading-page">{content}</main>
  ) : (
    content
  );
}
