// Client-only QA fixture: exercises the production gallery without database
// credentials. It is served only by scripts/design-fixtures.tsx on loopback.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ComponentGallery } from "../src/components/designs/component-gallery";
import { applyDesign, definitions, initialLayout } from "../src/lib/models";
const business = {
  id: "qa-gallery",
  name: "Sunday Coffee",
  slug: "sunday-coffee",
  description: "A place for your daily pause.",
  address: "24 Garden Lane",
  hours: "Every day, 8am–6pm",
  phone: "",
};
function GalleryFixture() {
  const [sections, setSections] = useState(() => initialLayout(business.name));
  const [unlocked, setUnlocked] = useState<string[]>(
    definitions.filter((d) => !d.premium).map((d) => d.key),
  );
  const [history, setHistory] = useState(sections.map((s) => s.key));
  return (
    <main className="dashboard-main">
      <ComponentGallery
        business={business}
        products={[
          {
            id: "1",
            name: "House Flat White",
            description: "Silky milk and our signature espresso.",
            price: 1200,
            image: "/images/cafe/latte.jpg",
            categoryId: "coffee",
            available: true,
            position: 0,
          },
        ]}
        sections={sections}
        pages={[{ id: "home", title: "Home" }]}
        pageId="home"
        onPageChange={() => {}}
        catalog={definitions.map((d) => ({ ...d, active: true }))}
        unlocked={unlocked}
        history={history}
        onApply={(key) => {
          setSections((current) => applyDesign(current, key, business.name));
          setHistory((current) => [key, ...current.filter((k) => k !== key)]);
        }}
        onUnlock={async (key) => setUnlocked((current) => [...current, key])}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<GalleryFixture />);
