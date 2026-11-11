import type { WebsiteSectionProps as Props } from "../types";
import { CafeImage } from "../cafe-image";
import { SectionButton } from "./shared";
function HeroCopy({ settings: s }: Props) {
  return (
    <div className="hero-copy">
      <span className="site-kicker">
        {s.eyebrow ?? "GOOD COFFEE. SLOW MOMENTS."}
      </span>
      <h1>{s.title}</h1>
      <p>{s.description}</p>
      <SectionButton settings={s} />
    </div>
  );
}
export function HeroClassic(props: Props) {
  return (
    <div className="site-hero hero-portrait">
      <HeroCopy {...props} />
      <figure>
        <CafeImage
          src={props.settings.image}
          alt={props.settings.imageAlt ?? "Freshly brewed coffee"}
          priority
        />
        <figcaption>Thoughtfully sourced. Beautifully brewed.</figcaption>
      </figure>
    </div>
  );
}
export function HeroFullImage(props: Props) {
  return (
    <div className="site-hero hero-full-image">
      <CafeImage
        className="hero-backdrop"
        src={props.settings.image}
        alt={props.settings.imageAlt ?? "Our café"}
        priority
      />
      <div className="hero-shade" />
      <HeroCopy {...props} />
      <span className="hero-bottom-note">
        YOUR DAILY RITUAL, REIMAGINED <span aria-hidden="true">↓</span>
      </span>
    </div>
  );
}
export function HeroSplit(props: Props) {
  return (
    <div className="site-hero hero-split-premium">
      <HeroCopy {...props} />
      <figure>
        <CafeImage
          src={props.settings.image}
          alt={props.settings.imageAlt ?? "The coffee ritual"}
          priority
        />
        <span className="image-stamp" aria-hidden="true">
          TAKE
          <br />A MOMENT
          <br />✳
        </span>
      </figure>
    </div>
  );
}
export function HeroEditorial(props: Props) {
  return (
    <div className="site-hero hero-editorial">
      <div className="editorial-topline">
        <span>{props.business.name}</span>
        <span>COFFEE · CONVERSATION · COMMUNITY</span>
      </div>
      <HeroCopy {...props} />
      <figure>
        <CafeImage
          src={props.settings.image}
          alt={props.settings.imageAlt ?? "Coffee, made with care"}
          priority
        />
        <figcaption>A good day begins here.</figcaption>
      </figure>
      <span className="editorial-star" aria-hidden="true">
        ✳
      </span>
    </div>
  );
}
