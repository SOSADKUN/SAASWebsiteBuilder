"use client";
import { useState } from "react";
export function CafeImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const source = src && failed !== src ? src : "/images/cafe/interior.jpg";
  return (
    <img
      className={className}
      src={source}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => {
        if (source !== "/images/cafe/interior.jpg") setFailed(src);
      }}
    />
  );
}
