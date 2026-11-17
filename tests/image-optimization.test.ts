// Exercise the shipped worker with real Sharp encoding behind browser API
// adapters. Separate headless-browser QA checks actual Canvas/Bitmap behavior.
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import sharp from "sharp";
import { it, expect } from "vitest";
async function optimize(
  file: File,
): Promise<{ blob?: Blob; error?: string; width?: number; height?: number }> {
  const code = await readFile("public/image-worker.js", "utf8");
  return new Promise((resolve, reject) => {
    const self: {
      onmessage?: (e: unknown) => Promise<void>;
      postMessage: (v: unknown) => void;
    } = { postMessage: (v) => resolve(v as never) };
    class Canvas {
      bitmap?: { data: Buffer; width: number; height: number };
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return {
          drawImage: (bitmap: Canvas["bitmap"]) => {
            this.bitmap = bitmap;
          },
        };
      }
      async convertToBlob({ quality }: { quality: number }) {
        const b = this.bitmap!;
        return new Blob(
          [
            new Uint8Array(
              await sharp(b.data, {
                raw: { width: b.width, height: b.height, channels: 4 },
              })
                .resize(this.width, this.height)
                .webp({ quality: Math.round(quality * 100) })
                .toBuffer(),
            ),
          ],
          { type: "image/webp" },
        );
      }
    }
    runInNewContext(code, {
      self,
      OffscreenCanvas: Canvas,
      createImageBitmap: async (blob: Blob) => {
        const { data, info } = await sharp(
          new Uint8Array(await blob.arrayBuffer()),
        )
          .rotate()
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        return { data, width: info.width, height: info.height, close() {} };
      },
    });
    self.onmessage!({ data: { file } }).catch(reject);
  });
}
it("keeps a small transparent logo unchanged", async () => {
  const bytes = await sharp({
    create: {
      width: 80,
      height: 40,
      channels: 4,
      background: { r: 20, g: 70, b: 40, alpha: 0.2 },
    },
  })
    .png()
    .toBuffer();
  const file = new File([new Uint8Array(bytes)], "logo.png", {
    type: "image/png",
  });
  const result = await optimize(file);
  expect(result.blob).toBe(file);
  expect(await result.blob!.arrayBuffer()).toEqual(await file.arrayBuffer());
});
it("encodes WebP, preserves transparency/aspect and limits longest edge", async () => {
  const bytes = await sharp({
    create: {
      width: 2400,
      height: 1200,
      channels: 4,
      background: { r: 20, g: 70, b: 40, alpha: 0.2 },
    },
  })
    .png()
    .toBuffer();
  const result = await optimize(
    new File([new Uint8Array(bytes)], "banner.png", { type: "image/png" }),
  );
  expect(result).toMatchObject({ width: 1920, height: 960 });
  expect(result.blob!.type).toBe("image/webp");
  expect(result.blob!.size).toBeLessThanOrEqual(2 * 1024 * 1024);
  expect(
    (await sharp(new Uint8Array(await result.blob!.arrayBuffer())).metadata())
      .hasAlpha,
  ).toBe(true);
});
it("honors orientation before calculating resized dimensions", async () => {
  const bytes = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await optimize(
    new File([new Uint8Array(bytes)], "portrait.jpg", { type: "image/jpeg" }),
  );
  expect(result).toMatchObject({ width: 960, height: 1920 });
});
it("rejects corrupt, oversized and HEIC inputs", async () => {
  for (const file of [
    new File(["broken"], "bad.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(20 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    }),
    new File(["heic"], "photo.heic", { type: "image/heic" }),
  ])
    expect((await optimize(file)).error).toBeTruthy();
});
