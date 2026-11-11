// Visual QA uses the real renderer and bundled assets, without an auth bypass
// or a production mock route. The server binds only to this machine.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { WebsiteRenderer } from "../src/components/website/registry";
import {
  definitions,
  defaultSettings,
  type Section,
  type Product,
} from "../src/lib/models";
const business = {
  id: "visual-qa",
  name: "Sunday Coffee",
  slug: "sunday-coffee",
  description: "Good coffee and a little room to slow down.",
  address: "24 Garden Lane, Kuala Lumpur",
  hours: "Weekdays 8am – 6pm\nWeekends 9am – 7pm",
  phone: "",
};
const products: Product[] = [
  {
    id: "1",
    name: "House Flat White",
    description: "Rich espresso. Silky milk. A daily ritual worth keeping.",
    price: 1200,
    image: "/images/cafe/latte.jpg",
    categoryId: "coffee",
    available: true,
    position: 0,
  },
  {
    id: "2",
    name: "Butter Croissant",
    description: "Layers of golden pastry, baked fresh each morning.",
    price: 900,
    image: "/images/cafe/pastry.jpg",
    categoryId: "pastry",
    available: true,
    position: 1,
  },
  {
    id: "3",
    name: "Iced Oat Latte",
    description: "A smooth espresso over ice, finished with oat milk.",
    price: 1500,
    image: "/images/cafe/iced-latte.jpg",
    categoryId: "coffee",
    available: true,
    position: 2,
  },
];
function section(key: string): Section {
  const d = definitions.find((d) => d.key === key)!;
  return {
    id: crypto.randomUUID(),
    key,
    version: d.version,
    visible: true,
    settings: {
      ...defaultSettings(key),
      ...(d.type === "header" || d.type === "footer"
        ? { title: business.name, eyebrow: "COFFEE & GOOD COMPANY" }
        : {}),
      ...(d.type === "about"
        ? {
            description:
              "We believe a good café is more than the coffee. It is a familiar face, a favorite table, and a place where your day has room to breathe. We source our beans thoughtfully, bake fresh each morning, and always save a seat for you.",
          }
        : {}),
    },
  };
}
createServer(async (req, res) => {
  try {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (path === "/gallery.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(await readFile(".design-qa/gallery.js"));
      return;
    }
    if (path === "/gallery") {
      const files = ["globals.css", "website.css", "design-gallery.css"];
      const styles = (
        await Promise.all(
          files.map((file) => readFile(`src/app/${file}`, "utf8")),
        )
      )
        .join("\n")
        .replaceAll(/@import[^;]+;/g, "");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gallery QA</title><style>${styles}</style></head><body><div id="root"></div><script src="/gallery.js"></script></body></html>`,
      );
      return;
    }
    if (path === "/" || path === "/library" || path.startsWith("/variant/")) {
      const keys =
        path === "/library"
          ? definitions.map((d) => d.key)
          : path.startsWith("/variant/")
            ? [path.slice("/variant/".length)]
            : [
                "header-minimal",
                "hero-full-image",
                "about-classic",
                "menu-grid",
                "gallery-grid",
                "footer-modern",
              ];
      if (keys.some((key) => !definitions.some((d) => d.key === key))) {
        res.writeHead(404);
        res.end();
        return;
      }
      const html = renderToStaticMarkup(
        <WebsiteRenderer
          sections={keys.map(section)}
          business={business}
          products={products}
        />,
      );
      const css = await readFile("src/app/website.css", "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Café section visual QA</title><style>*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}h1,h2,h3,p{margin:0}button{font:inherit}summary{cursor:pointer}small{font-size:11px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}${css}</style></head><body>${html}</body></html>`,
      );
      return;
    }
    const root = resolve("public");
    const file = resolve(root, "." + decodeURIComponent(path));
    if (!file.startsWith(root + "/") && !file.startsWith(root + "\\")) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await readFile(file);
    const types: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".ttf": "font/ttf",
      ".txt": "text/plain",
    };
    res.setHeader(
      "Content-Type",
      types[extname(file)] ?? "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(3200, "127.0.0.1", () =>
  console.log(
    "Design QA: http://127.0.0.1:3200 · /library · /variant/hero-editorial",
  ),
);
