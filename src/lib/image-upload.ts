"use client";
export type ImageProgress = {
  status: string;
  original: number;
  optimized?: number;
  progress?: number;
};
const retryIds = new Map<string, string>();
async function processImage(
  file: File,
  merchantId: string,
  kind: "media" | "product",
  report: (state: ImageProgress) => void,
) {
  report({ status: "Optimizing image...", original: file.size });
  const blob = await new Promise<Blob>((resolve, reject) => {
    const worker = new Worker("/image-worker.js");
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Error("Image processing took too long. Choose a smaller image."));
    }, 60000);
    worker.onmessage = ({ data }) => {
      clearTimeout(timer);
      worker.terminate();
      data.error ? reject(Error(data.error)) : resolve(data.blob);
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(Error("Image processing is unavailable. Use a current browser."));
    };
    worker.postMessage({ file });
  });
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const retryKey = `servqoo.image.${merchantId}.${hash}`;
  let id: string = retryIds.get(retryKey) ?? crypto.randomUUID();
  try {
    const key = retryKey;
    const saved = sessionStorage.getItem(key);
    if (saved)
      id = saved as `${string}-${string}-${string}-${string}-${string}`;
    else sessionStorage.setItem(key, id);
  } catch {
    /* tab memory unavailable; server still reserves safely */
  }
  retryIds.set(retryKey, id);
  const form = new FormData();
  form.set(
    "file",
    blob,
    file.name.replace(/\.[^.]+$/, "") +
      (blob.type === "image/webp"
        ? ".webp"
        : blob.type === "image/png"
          ? ".png"
          : ".jpg"),
  );
  form.set("merchantId", merchantId);
  form.set("kind", kind);
  form.set("requestId", id);
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
    xhr.timeout = 60000;
    xhr.upload.onprogress = (e) =>
      report({
        status: e.loaded === e.total ? "Saving image..." : "Uploading image...",
        original: file.size,
        optimized: blob.size,
        progress: e.lengthComputable
          ? Math.round((e.loaded / e.total) * 100)
          : undefined,
      });
    xhr.onload = () => {
      let result;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(Error("Upload response was interrupted. Retry the same image."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && result.url) {
        report({
          status: "Image uploaded",
          original: file.size,
          optimized: blob.size,
          progress: 100,
        });
        window.dispatchEvent(new Event("servqoo:media-change"));
        resolve(result.url);
      } else
        reject(Error(result.error || "Upload failed. Retry the same image."));
    };
    xhr.onerror = xhr.ontimeout = () =>
      reject(
        Error("Upload interrupted. Retry the same image to reconcile it."),
      );
    xhr.send(form);
  });
}

export async function uploadOptimizedImage(
  file: File,
  merchantId: string,
  kind: "media" | "product",
  report: (state: ImageProgress) => void,
) {
  let last: ImageProgress = {
    status: "Preparing image...",
    original: file.size,
  };
  try {
    return await processImage(file, merchantId, kind, (state) => {
      last = state;
      report(state);
    });
  } catch (error) {
    report({
      ...last,
      status: "Upload failed. Check the message and retry the same image.",
    });
    throw error;
  }
}
