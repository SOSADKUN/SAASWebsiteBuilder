import { admin } from "@/lib/auth";
import { db } from "@/db";
import { adminListing } from "@/server/actions";
import { definitions } from "@/lib/models";
import { Brand } from "@/components/brand";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  await admin();
  const database = db();
  const [merchants, components, prices] = await Promise.all([
    database.query.merchants.findMany(),
    database.query.componentDefinitions.findMany(),
    database.query.storeProducts.findMany(),
  ]);
  return (
    <main className="admin-page">
      <header>
        <Brand />
        <h1>Platform administration</h1>
        <Link className="button compact" href="/dashboard">
          Merchant dashboard ↗
        </Link>
      </header>
      <div className="notice">
        Only registered, deployed React components can be listed. Unpublishing
        prevents new saves and selections; existing published sites retain their
        version.
      </div>
      <h2>Registered businesses · {merchants.length}</h2>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Public address</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>
                  <a href={`/sites/${m.slug}`}>/sites/{m.slug} ↗</a>
                </td>
                <td>{m.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Component library · {components.length}</h2>
      <div className="admin-grid">
        {components.map((c) => (
          <form className="panel" action={adminListing} key={c.key}>
            <input type="hidden" name="key" value={c.key} />
            <h3>{c.name}</h3>
            <small>
              {c.key} · version 1.0
              <br />
              {definitions.find((d) => d.key === c.key)?.description}
            </small>
            <label>
              Category
              <input
                name="category"
                defaultValue={c.category}
                required
                maxLength={60}
                list="component-categories"
              />
            </label>
            <label>
              Price (USD cents)
              <input
                name="price"
                type="number"
                min={0}
                max={1000000}
                defaultValue={
                  prices.find((p) => p.componentKey === c.key)?.price ?? 0
                }
                required
              />
            </label>
            <label className="checkbox-label">
              <input
                name="premium"
                type="checkbox"
                defaultChecked={c.premium}
              />{" "}
              Premium component
            </label>
            <label className="checkbox-label">
              <input name="active" type="checkbox" defaultChecked={c.active} />{" "}
              Published in store
            </label>
            <button className="button primary">Save listing</button>
          </form>
        ))}
      </div>
      <datalist id="component-categories">
        {[
          "header",
          "hero",
          "menu",
          "gallery",
          "footer",
          "about",
          "ordering",
          "location",
          "contact",
          "themes",
        ].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </datalist>
    </main>
  );
}
import Link from "next/link";
