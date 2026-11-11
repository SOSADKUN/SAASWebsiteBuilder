"use client";
import { Plus, Check } from "lucide-react";
import { CafeImage } from "@/components/website/cafe-image";
const bundled = [
  { id: "coffee", url: "/images/cafe/coffee.jpg", name: "Coffee ritual" },
  {
    id: "interior",
    url: "/images/cafe/interior.jpg",
    name: "A welcoming space",
  },
  { id: "latte", url: "/images/cafe/latte.jpg", name: "A cup, made with care" },
  { id: "pastry", url: "/images/cafe/pastry.jpg", name: "Fresh from the oven" },
];
export function MediaPicker({
  media,
  value,
  onSelect,
  onAdd,
}: {
  media: { id: string; url: string; name: string }[];
  value: string;
  onSelect: (url: string) => void;
  onAdd?: (url: string, alt: string) => void;
}) {
  return (
    <div className="section-media-picker">
      <h4>Choose an image</h4>
      <small>Your library & licensed demo photography</small>
      <div className="section-media-options">
        {[...media, ...bundled].map((image) => (
          <div key={image.id}>
            <button
              className={
                value === image.url ? "image-choice selected" : "image-choice"
              }
              onClick={() => onSelect(image.url)}
              aria-label={`Select ${image.name}`}
              aria-pressed={value === image.url}
            >
              <CafeImage src={image.url} alt={image.name} />
              {value === image.url && (
                <span>
                  <Check size={11} />
                </span>
              )}
            </button>
            {onAdd && (
              <button
                className="gallery-add-image"
                aria-label={`Add ${image.name} to gallery`}
                onClick={() => onAdd(image.url, image.name)}
              >
                <Plus size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
