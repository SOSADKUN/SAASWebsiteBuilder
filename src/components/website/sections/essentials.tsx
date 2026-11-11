import type { WebsiteSectionProps as Props } from "../types";
export function Ordering({ settings: s, business: b }: Props) {
  return (
    <div className="cafe-cta">
      <h2>{s.title}</h2>
      <p>{s.description}</p>
      {b.phone ? (
        <a className="cafe-button" href={`https://wa.me/${b.phone}`}>
          Order on WhatsApp ↗
        </a>
      ) : (
        s.buttonText && (
          <a className="cafe-button" href={s.buttonUrl}>
            {s.buttonText} ↗
          </a>
        )
      )}
    </div>
  );
}
export function Location({ settings: s, business: b }: Props) {
  return (
    <div id="location" className="cafe-location">
      <div>
        <span className="eyebrow">STAY A WHILE</span>
        <h2>{s.title}</h2>
        <p>{s.description}</p>
      </div>
      <div>
        <h3>Find us</h3>
        <p>{b.address || "Address coming soon"}</p>
        <h3>Opening hours</h3>
        <p style={{ whiteSpace: "pre-line" }}>
          {b.hours || "Contact us for opening hours"}
        </p>
      </div>
    </div>
  );
}
export function Contact({ settings: s, business: b }: Props) {
  return (
    <div>
      <h2>{s.title}</h2>
      <p>{s.description}</p>
      <nav className="cafe-contact">
        {s.links.map((l, i) => (
          <a key={i} href={l.url}>
            {l.label} ↗
          </a>
        ))}
        {b.phone && <a href={`https://wa.me/${b.phone}`}>WhatsApp ↗</a>}
      </nav>
    </div>
  );
}
