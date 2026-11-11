import type { Settings } from "@/lib/models";
import type { WebsiteSectionProps as Props } from "../types";
import { CafeImage } from "../cafe-image";
import { SectionHeading } from "./shared";
function galleryImages(s: Settings) {
  return [
    { url: s.image || "/images/cafe/interior.jpg", alt: s.imageAlt ?? s.title },
    ...(s.images ?? [
      { url: "/images/cafe/latte.jpg", alt: "A freshly made latte" },
      { url: "/images/cafe/pastry.jpg", alt: "Baked fresh each morning" },
    ]),
  ].filter((image) => image.url);
}
export function GalleryMasonry({ settings: s }: Props) {
  return (
    <div className="site-gallery gallery-masonry">
      <SectionHeading settings={s} label="LIFE AROUND HERE" />
      <div className="masonry-photos">
        {galleryImages(s).map((image, i) => (
          <figure key={i}>
            <CafeImage src={image.url} alt={image.alt} />
            <figcaption>
              {String(i + 1).padStart(2, "0")} / {image.alt}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
export function GalleryEditorial({ settings: s }: Props) {
  const images = galleryImages(s);
  return (
    <div className="site-gallery gallery-editorial">
      <div className="editorial-gallery-heading">
        <SectionHeading settings={s} label="COLLECTED MOMENTS" />
        <span aria-hidden="true">↙</span>
      </div>
      <div className="editorial-photos">
        {images.map((image, i) => (
          <figure key={i}>
            <CafeImage src={image.url} alt={image.alt} />
            <figcaption>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {image.alt}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
