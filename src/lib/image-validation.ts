import sharp from "sharp";
import {
  IMAGE_TYPES,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
} from "./uploads";

export async function validateImage(bytes: Uint8Array, mime: string) {
  if (
    !bytes.length ||
    bytes.length > MAX_UPLOAD_BYTES ||
    !IMAGE_TYPES.includes(mime)
  )
    throw new Error("Only valid JPEG, PNG and WebP images are accepted");
  try {
    const image = sharp(bytes, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const types = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    if (
      !(metadata.format! in types) ||
      types[metadata.format as keyof typeof types] !== mime ||
      !metadata.width ||
      !metadata.height ||
      Math.max(metadata.width, metadata.height) > MAX_IMAGE_EDGE ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("invalid");
    // metadata() alone does not decode the pixels or detect truncated data.
    await image.raw().toBuffer();
    return {
      extension: metadata.format === "jpeg" ? "jpg" : metadata.format!,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    throw new Error("Only valid JPEG, PNG and WebP images are accepted");
  }
}
