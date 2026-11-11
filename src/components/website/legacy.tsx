// Frozen version-one layouts. Keep these implementations available for saved
// and published snapshots; visual redesigns are registered as version two.
import type { WebsiteSectionProps as Props } from "./types";
export function LegacyHeader({
  settings: s,
  business: b,
  center = false,
  dark = false,
}: Props & { center?: boolean; dark?: boolean }) {
  return (
    <header
      className={`cafe-header ${center ? "centered" : ""} ${dark ? "premium-header" : ""}`}
    >
      <a href="#">
        {s.image && (
          <img className="cafe-logo" src={s.image} alt={`${b.name} logo`} />
        )}{" "}
        {s.title || b.name}
        <span>COFFEE & COMMUNITY</span>
      </a>
      <nav>
        {s.links.map((l, i) => (
          <a key={i} href={l.url}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
export function LegacyHero({
  settings: s,
  split = false,
}: Props & { split?: boolean }) {
  return (
    <div className={`cafe-hero ${split ? "split" : ""}`}>
      <div>
        <span className="eyebrow">YOUR NEIGHBORHOOD, YOUR COFFEE</span>
        <h1>{s.title}</h1>
        <p>{s.description}</p>
        {s.buttonText && (
          <a className="cafe-button" href={s.buttonUrl}>
            {s.buttonText} <span>↗</span>
          </a>
        )}
        <small>Thoughtfully sourced. Freshly brewed. Always welcoming.</small>
      </div>
      {s.image && <img src={s.image} alt="Freshly brewed coffee at the café" />}
    </div>
  );
}
export function LegacyAbout({ settings: s }: Props) {
  return (
    <div className="cafe-about">
      <span className="eyebrow">A LITTLE ABOUT US</span>
      <h2>{s.title}</h2>
      <p>{s.description}</p>
    </div>
  );
}
export function LegacyMenu({
  settings: s,
  products,
  list = false,
}: Props & { list?: boolean }) {
  return (
    <div id="menu">
      <span className="eyebrow">THE GOOD STUFF</span>
      <h2>{s.title}</h2>
      <p>{s.description}</p>
      <div className={list ? "cafe-menu-list" : "cafe-menu-grid"}>
        {products
          .filter((p) => p.available)
          .map((p) => (
            <article key={p.id}>
              {p.image && <img src={p.image} alt={p.name} />}
              <div>
                <h3>
                  {p.name}
                  <span>RM {(p.price / 100).toFixed(2)}</span>
                </h3>
                <p>{p.description}</p>
              </div>
            </article>
          ))}
        {!products.some((p) => p.available) && (
          <p>Our menu is coming soon. Visit us to see what’s brewing.</p>
        )}
      </div>
    </div>
  );
}
export function LegacyGallery({ settings: s }: Props) {
  return (
    <div>
      <span className="eyebrow">AROUND HERE</span>
      <h2>{s.title}</h2>
      <p>{s.description}</p>
      {s.image && <img className="cafe-gallery" src={s.image} alt={s.title} />}
    </div>
  );
}
export function LegacyFooter({
  settings: s,
  business: b,
  modern = false,
}: Props & { modern?: boolean }) {
  return (
    <footer className={modern ? "cafe-footer modern" : "cafe-footer"}>
      <h3>{s.title || b.name}</h3>
      <p>{s.description}</p>
      <small>
        © {new Date().getFullYear()} {b.name}
      </small>
      <nav>
        {s.links.map((l, i) => (
          <a key={i} href={l.url}>
            {l.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
export const legacyRegistry: Record<string, React.ComponentType<Props>> = {
  "header-minimal": LegacyHeader,
  "header-centered": (p) => <LegacyHeader {...p} center />,
  "header-dark": (p) => <LegacyHeader {...p} dark />,
  "hero-classic": LegacyHero,
  "hero-split": (p) => <LegacyHero {...p} split />,
  "about-story": LegacyAbout,
  "menu-grid": LegacyMenu,
  "menu-list": (p) => <LegacyMenu {...p} list />,
  "gallery-grid": LegacyGallery,
  "footer-basic": LegacyFooter,
  "footer-modern": (p) => <LegacyFooter {...p} modern />,
};
