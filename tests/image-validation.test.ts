import sharp from "sharp";
import { it, expect } from "vitest";
import { validateImage } from "../src/lib/image-validation";
import { MAX_UPLOAD_BYTES } from "../src/lib/uploads";
it.each(["jpeg", "png", "webp"] as const)(
  "decodes valid %s pixels",
  async (format) => {
    const bytes = await sharp({
      create: {
        width: 32,
        height: 16,
        channels: 4,
        background: { r: 20, g: 90, b: 50, alpha: 0.4 },
      },
    })
      [format]()
      .toBuffer();
    expect(await validateImage(bytes, `image/${format}`)).toMatchObject({
      width: 32,
      height: 16,
    });
  },
);
it("preserves transparent WebP data and rejects MIME mismatches", async () => {
  const bytes = await sharp({
    create: {
      width: 20,
      height: 10,
      channels: 4,
      background: { r: 1, g: 2, b: 3, alpha: 0 },
    },
  })
    .webp()
    .toBuffer();
  await validateImage(bytes, "image/webp");
  expect((await sharp(bytes).metadata()).hasAlpha).toBe(true);
  await expect(validateImage(bytes, "image/png")).rejects.toThrow("Only valid");
});
it("rejects corrupt signatures, truncated files, unsafe SVG and oversized input", async () => {
  for (const bytes of [
    Buffer.from([0xff, 0xd8, 0xff, 0]),
    Buffer.from("<svg/>"),
    Buffer.alloc(MAX_UPLOAD_BYTES + 1),
  ])
    await expect(validateImage(bytes, "image/jpeg")).rejects.toThrow(
      "Only valid",
    );
  const valid = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await expect(
    validateImage(valid.subarray(0, valid.length - 30), "image/png"),
  ).rejects.toThrow();
});
it("rejects dimensions exceeding the final longest edge", async () => {
  const bytes = await sharp({
    create: { width: 1921, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await expect(validateImage(bytes, "image/png")).rejects.toThrow();
});
