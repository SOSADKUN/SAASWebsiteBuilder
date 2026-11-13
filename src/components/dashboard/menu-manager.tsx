"use client";
import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Search, Coffee } from "lucide-react";
import { ProductEditor } from "./product-editor";
import type { DashboardData as Data } from "./types";
import type { Product } from "@/lib/models";
import {
  saveMenuProduct,
  deleteProduct,
  saveCategory,
  deleteCategory,
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
  const [productError, setProductError] = useState<{
    error: string;
    reference: string;
  } | null>(null);
  const [filter, setFilter] = useState("all");
  const [categoryName, setCategoryName] = useState("");
  const [categoryEdit, setCategoryEdit] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [menuNotice, setMenuNotice] = useState("");
  const [productPending, startProductTransition] = useTransition();
  function toggleProduct(product: Product) {
    setProductError(null);
    setMenuNotice("");
    startProductTransition(async () => {
      try {
        const result = await saveMenuProduct(data.business.id, {
          ...product,
          available: !product.available,
        });
        if (!result.ok) {
          setProductError(result);
          return;
        }
        setMenuNotice(
          product.available ? "Product hidden." : "Product available.",
        );
      } catch {
        setProductError({
          error:
            "We could not confirm the save. Check your menu before trying again.",
          reference: "",
        });
      }
    });
  }
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
          disabled={pending || productPending}
          onClick={() => {
            setProductError(null);
            setEditing({
              categoryId: data.categories[0]?.id,
              available: true,
              position: data.products.length,
            });
          }}
        >
          <Plus size={16} /> Add product
        </button>
      </div>
      {menuNotice && (
        <p className="notice" role="status">
          {menuNotice}
        </p>
      )}
      {productError && (
        <p className="notice error" role="alert">
          {productError.error}
          {productError.reference && (
            <span className="workspace-reference">
              Support reference: {productError.reference}
            </span>
          )}
        </p>
      )}
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
                          disabled={pending || productPending}
                          onClick={() => toggleProduct(p)}
                        >
                          {p.available ? "Available" : "Hidden"}
                        </button>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${p.name}`}
                          onClick={() => {
                            setProductError(null);
                            setEditing(p);
                          }}
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
        <ProductEditor
          product={editing}
          categories={data.categories}
          merchantId={data.business.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMenuNotice("Product saved.");
          }}
        />
      )}
    </>
  );
}
