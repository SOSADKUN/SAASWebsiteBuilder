"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Coffee, X } from "lucide-react";
import type { DashboardData as Data } from "./types";
import type { Product } from "@/lib/models";
import {
  saveProduct,
  deleteProduct,
  saveCategory,
  deleteCategory,
  upload,
} from "@/server/actions";
export function MenuManager({
  data,
  run,
  pending,
}: {
  data: Data;
  run: (action: () => Promise<unknown>, message: string) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [filter, setFilter] = useState("all");
  const [categoryName, setCategoryName] = useState("");
  const [categoryEdit, setCategoryEdit] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SOMETHING FOR EVERY CRAVING</span>
          <h1>The good stuff, all here.</h1>
          <p>Your menu updates automatically across your website.</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setEditing({
              categoryId: data.categories[0]?.id,
              available: true,
              position: data.products.length,
            })
          }
        >
          <Plus size={16} /> Add product
        </button>
      </div>
      <div className="menu-layout">
        <aside className="panel categories-panel">
          <h3>Categories</h3>
          <button
            className={filter === "all" ? "category active" : "category"}
            onClick={() => setFilter("all")}
          >
            All products <span>{data.products.length}</span>
          </button>
          {data.categories.map((c) => (
            <div className="category-wrap" key={c.id}>
              <button
                className={filter === c.id ? "category active" : "category"}
                onClick={() => setFilter(c.id)}
              >
                {c.name}
                <span>
                  {data.products.filter((p) => p.categoryId === c.id).length}
                </span>
              </button>
              <button
                className="icon-button"
                aria-label={`Edit ${c.name}`}
                onClick={() => {
                  setCategoryEdit(c.id);
                  setCategoryName(c.name);
                }}
              >
                <Pencil size={12} />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${c.name}`}
                onClick={() =>
                  run(
                    () => deleteCategory(data.business.id, c.id),
                    "Category deleted.",
                  )
                }
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  saveCategory(data.business.id, categoryName, categoryEdit),
                "Category saved.",
              );
              setCategoryName("");
              setCategoryEdit(undefined);
            }}
          >
            <input
              aria-label="Category name"
              placeholder="New category"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              maxLength={60}
              required
            />
            <button disabled={pending} className="button compact">
              {categoryEdit ? "Save category" : "+ Add category"}
            </button>
          </form>
        </aside>
        <div className="panel menu-table">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search menu products"
              placeholder="Search your menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.products
                  .filter(
                    (p) =>
                      (filter === "all" || p.categoryId === filter) &&
                      p.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-name">
                          {p.image ? (
                            <img src={p.image} alt="" />
                          ) : (
                            <span className="step-icon sage">
                              <Coffee size={20} />
                            </span>
                          )}
                          <div>
                            <b>{p.name}</b>
                            <small>{p.description}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {
                          data.categories.find((c) => c.id === p.categoryId)
                            ?.name
                        }
                      </td>
                      <td>RM {(p.price / 100).toFixed(2)}</td>
                      <td>
                        <button
                          className={`pill ${p.available ? "" : "unavailable"}`}
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                saveProduct(data.business.id, {
                                  ...p,
                                  available: !p.available,
                                }),
                              p.available
                                ? "Product hidden."
                                : "Product available.",
                            )
                          }
                        >
                          {p.available ? "Available" : "Hidden"}
                        </button>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${p.name}`}
                          onClick={() => setEditing(p)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${p.name}`}
                          onClick={() =>
                            run(
                              () => deleteProduct(data.business.id, p.id),
                              "Product deleted.",
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!data.products.length && (
            <div className="empty-state">
              <Coffee size={30} />
              <h3>What’s brewing?</h3>
              <p>Add your first menu product to get started.</p>
            </div>
          )}
        </div>
      </div>
      {editing && (
        <div className="modal-overlay">
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit product"
          >
            <div className="modal-heading">
              <h3>{editing.id ? "Edit product" : "A new menu favorite"}</h3>
              <button
                className="icon-button"
                aria-label="Close product form"
                onClick={() => setEditing(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              action={(form) => {
                run(async () => {
                  await saveProduct(data.business.id, {
                    id: editing.id,
                    name: String(form.get("name")),
                    description: String(form.get("description")),
                    price: Math.round(Number(form.get("price")) * 100),
                    image: String(form.get("image")),
                    categoryId: String(form.get("categoryId")),
                    available: form.get("available") === "on",
                    position: Number(form.get("position")),
                  });
                  setEditing(null);
                }, "Product saved.");
              }}
            >
              <label>
                Product name
                <input
                  name="name"
                  defaultValue={editing.name}
                  maxLength={120}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={editing.description}
                  maxLength={1000}
                />
              </label>
              <div className="form-columns">
                <label>
                  Price (RM)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    defaultValue={(editing.price ?? 0) / 100}
                    required
                  />
                </label>
                <label>
                  Category
                  <select
                    name="categoryId"
                    defaultValue={editing.categoryId}
                    required
                  >
                    {data.categories.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Image URL
                <input
                  name="image"
                  value={editing.image ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, image: e.target.value })
                  }
                />
              </label>
              <label>
                Upload product image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={pending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.set("file", file);
                    run(
                      async () =>
                        setEditing({
                          ...editing,
                          image: await upload(data.business.id, form),
                        }),
                      "Image uploaded.",
                    );
                  }}
                />
              </label>
              <label>
                Display order
                <input
                  name="position"
                  type="number"
                  min="0"
                  max="10000"
                  defaultValue={editing.position ?? 0}
                  required
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="available"
                  defaultChecked={editing.available}
                />{" "}
                Available on website
              </label>
              <button
                className="button primary"
                disabled={pending || !data.categories.length}
              >
                {pending ? "Saving…" : "Save product"}
              </button>
              {!data.categories.length && (
                <p>Add a category before creating a product.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
