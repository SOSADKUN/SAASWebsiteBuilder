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

// New layouts use version 3 so existing saved/published v1/v2 headers keep
// their original rendering until the merchant explicitly changes the design.
export function HeaderStacked(props: Props) {
  return (
    <header className="site-header header-stacked-layout">
      <div className="header-stacked-brand">
        <Brand {...props} />
      </div>
      <Navigation {...props} />
    </header>
  );
}
export function HeaderMasthead(props: Props) {
  const { settings: s } = props;
  return (
    <header className="site-header header-masthead-layout">
      <div className="header-masthead-top">
        <Brand {...props} />
        {s.buttonText && (
          <a className="header-masthead-action" href={s.buttonUrl}>
            {s.buttonText}
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <div className="header-masthead-bottom">
        <p>{s.description}</p>
        <Navigation {...props} />
      </div>
    </header>
  );
}
