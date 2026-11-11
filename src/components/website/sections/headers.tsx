import type { WebsiteSectionProps as Props } from "../types";
import { CafeImage } from "../cafe-image";
function Brand({ settings: s, business: b }: Props) {
  return (
    <a className="site-brand" href="#">
      {s.image && (
        <CafeImage className="site-logo" src={s.image} alt={`${b.name} logo`} />
      )}
      <span>
        {s.title || b.name}
        <small>{s.eyebrow ?? "COFFEE & COMMUNITY"}</small>
      </span>
    </a>
  );
}
function Navigation({ settings: s }: Props) {
  return (
    <>
      <nav className="site-desktop-nav" aria-label="Main navigation">
        {s.links.map((link, i) => (
          <a key={i} href={link.url}>
            {link.label}
          </a>
        ))}
      </nav>
      <details className="site-mobile-nav">
        <summary aria-label="Open navigation">
          <span />
          <span />
          <span className="sr-only">Menu</span>
        </summary>
        <nav aria-label="Mobile navigation">
          {s.links.map((link, i) => (
            <a key={i} href={link.url}>
              {link.label}
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      </details>
    </>
  );
}
export function HeaderMinimal(props: Props) {
  return (
    <header className="site-header header-minimal">
      <Brand {...props} />
      <Navigation {...props} />
    </header>
  );
}
export function HeaderCentered(props: Props) {
  return (
    <header className="site-header header-centered">
      <span className="header-note">A little pause. A better day.</span>
      <Brand {...props} />
      <Navigation {...props} />
    </header>
  );
}
export function HeaderPremiumDark(props: Props) {
  return (
    <header className="site-header header-dark">
      <Brand {...props} />
      <Navigation {...props} />
      <span className="header-seal" aria-hidden="true">
        ✳
      </span>
    </header>
  );
}
