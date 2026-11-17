/* Image decoding and encoding stay off the UI thread. No third-party decoder. */
self.onmessage = async ({ data: { file } }) => {
  let bitmap;
  try {
    if (
      !file.size ||
      file.size > 20 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw Error(
        "Choose JPEG, PNG or WebP up to 20 MiB. HEIC is not supported.",
      );
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (bitmap.width * bitmap.height > 40000000)
      throw Error("Image dimensions are too large (maximum 40 megapixels).");
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let output = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.8,
    });
    // Keep small originals losslessly when conversion would only increase size.
    if (
      scale === 1 &&
      (file.size <= output.size ||
        (file.size <= 256 * 1024 &&
          Math.max(bitmap.width, bitmap.height) <= 512)) &&
      file.size <= 2 * 1024 * 1024
    )
      output = file;
    for (const quality of [0.7, 0.6, 0.5]) {
      if (output.size <= 2 * 1024 * 1024) break;
      output = await canvas.convertToBlob({ type: "image/webp", quality });
    }
    if (output.size > 2 * 1024 * 1024)
      throw Error("Image cannot fit 2 MiB. Choose a simpler or smaller image.");
    self.postMessage({
      blob: output,
      width: canvas.width,
      height: canvas.height,
    });
  } catch (error) {
    self.postMessage({
      error:
        error.message ||
        "Image could not be decoded. Use a current browser and a valid JPEG, PNG or WebP.",
    });
  } finally {
    bitmap?.close();
  }
};
