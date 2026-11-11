import type { WebsiteSectionProps as Props } from "../types";
import { CafeImage } from "../cafe-image";
import { SectionHeading, SectionButton } from "./shared";
export function AboutClassic({ settings: s }: Props) {
  return (
    <div className="site-about about-classic">
      <figure>
        <CafeImage src={s.image} alt={s.imageAlt ?? "Inside our café"} />
        <span aria-hidden="true">SLOW DOWN. STAY A WHILE.</span>
      </figure>
      <div>
        <SectionHeading settings={s} label="A LITTLE ABOUT US" />
        <SectionButton settings={s} />
      </div>
    </div>
  );
}
export function AboutStory({ settings: s, business: b }: Props) {
  return (
    <div className="site-about about-story">
      <div className="story-intro">
        <span className="site-kicker">{s.eyebrow ?? "OUR STORY"}</span>
        <span className="story-symbol" aria-hidden="true">
          ✳
        </span>
        <small>{b.name}</small>
      </div>
      <div className="story-copy">
        <h2>{s.title}</h2>
        <div className="story-columns">
          <p>{s.description}</p>
          <CafeImage
            src={s.image}
            alt={s.imageAlt ?? "A space to make yourself at home"}
          />
        </div>
        <span className="story-signature">
          Made with care, shared with you.
        </span>
      </div>
    </div>
  );
}
