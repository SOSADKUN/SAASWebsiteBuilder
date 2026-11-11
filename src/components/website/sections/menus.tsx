import type { Product } from "@/lib/models";
import type { WebsiteSectionProps as Props } from "../types";
import { CafeImage } from "../cafe-image";
import { SectionHeading } from "./shared";
function Price({ product }: { product: Product }) {
  return (
    <span className="site-price">RM {(product.price / 100).toFixed(2)}</span>
  );
}
function EmptyMenu() {
  return (
    <p className="site-empty-menu">
      Our menu is coming soon. Visit us to see what’s brewing.
    </p>
  );
}
export function MenuProductGrid({ settings: s, products }: Props) {
  const items = products.filter((p) => p.available);
  return (
    <div className="site-menu menu-product-grid">
      <SectionHeading settings={s} label="THE GOOD STUFF" />
      <div className="site-product-grid">
        {items.map((p) => (
          <article key={p.id}>
            <div className="product-photo">
              <CafeImage
                src={p.image || "/images/cafe/latte.jpg"}
                alt={p.name}
              />
            </div>
            <div className="product-title">
              <h3>{p.name}</h3>
              <Price product={p} />
            </div>
            <p>{p.description}</p>
          </article>
        ))}
      </div>
      {!items.length && <EmptyMenu />}
    </div>
  );
}
export function MenuElegantList({ settings: s, products }: Props) {
  const items = products.filter((p) => p.available);
  return (
    <div className="site-menu menu-elegant-list">
      <div>
        <SectionHeading settings={s} label="ON THE MENU" />
        <CafeImage
          className="list-menu-photo"
          src={s.image}
          alt={s.imageAlt ?? "Made fresh for you"}
        />
      </div>
      <div className="site-menu-lines">
        {items.map((p, i) => (
          <article key={p.id}>
            <span className="menu-index">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="menu-line-heading">
                <h3>{p.name}</h3>
                <span className="menu-leader" />
                <Price product={p} />
              </div>
              <p>{p.description}</p>
            </div>
          </article>
        ))}
        {!items.length && <EmptyMenu />}
      </div>
    </div>
  );
}
export function MenuFeatured({ settings: s, products }: Props) {
  const items = products.filter((p) => p.available).slice(0, 3);
  return (
    <div className="site-menu menu-featured">
      <SectionHeading settings={s} label="HOUSE FAVORITES" />
      <div className="featured-products">
        {items.map((p, i) => (
          <article key={p.id}>
            <CafeImage
              src={p.image || "/images/cafe/pastry.jpg"}
              alt={p.name}
            />
            <div>
              <span className="site-kicker">
                NO. {String(i + 1).padStart(2, "0")} / A LITTLE FAVORITE
              </span>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <Price product={p} />
            </div>
          </article>
        ))}
      </div>
      {!items.length && <EmptyMenu />}
    </div>
  );
}
