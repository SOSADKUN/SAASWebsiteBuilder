import type { Settings } from "@/lib/models";
export function SectionHeading({
  settings: s,
  label,
}: {
  settings: Settings;
  label: string;
}) {
  return (
    <div className="site-section-heading">
      <span className="site-kicker">{s.eyebrow ?? label}</span>
      <h2>{s.title}</h2>
      <p>{s.description}</p>
    </div>
  );
}
export function SectionButton({ settings: s }: { settings: Settings }) {
  return s.buttonText ? (
    <a className="site-button" href={s.buttonUrl}>
      {s.buttonText}
      <span aria-hidden="true">↗</span>
    </a>
  ) : null;
}
