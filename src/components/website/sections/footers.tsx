import type { WebsiteSectionProps as Props } from "../types";
export function FooterMinimal({ settings: s, business: b }: Props) {
  return (
    <footer className="site-footer footer-minimal">
      <div>
        <a className="footer-wordmark" href="#">
          {s.title || b.name}
        </a>
        <p>{s.description}</p>
      </div>
      <nav aria-label="Footer navigation">
        {s.links.map((l, i) => (
          <a key={i} href={l.url}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {b.name}
        </span>
        <a href="#">Back to the top ↑</a>
      </div>
    </footer>
  );
}
export function FooterColumns({ settings: s, business: b }: Props) {
  return (
    <footer className="site-footer footer-columns">
      <div className="footer-invitation">
        <span className="site-kicker">{s.eyebrow ?? "COME AS YOU ARE"}</span>
        <h2>{s.title || b.name}</h2>
        <p>{s.description}</p>
        <span className="footer-flower" aria-hidden="true">
          ✳
        </span>
      </div>
      <div className="footer-column-grid">
        <div>
          <h3>Make yourself at home.</h3>
          <p>{b.description}</p>
        </div>
        <nav aria-label="Explore">
          <h3>Explore</h3>
          {s.links.map((l, i) => (
            <a key={i} href={l.url}>
              {l.label}
            </a>
          ))}
        </nav>
        <div>
          <h3>Find us</h3>
          <p>{b.address || "Address coming soon"}</p>
          {b.phone && <a href={`https://wa.me/${b.phone}`}>Say hello ↗</a>}
        </div>
        <div>
          <h3>Stay a little longer</h3>
          <p>{b.hours || "Contact us for opening hours"}</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {b.name}
        </span>
        <a href="#">Back to the top ↑</a>
      </div>
    </footer>
  );
}
