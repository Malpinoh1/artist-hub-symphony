/**
 * Convert an uploaded raster image to WebP in the browser before it reaches Storage.
 * Throws on conversion failure so callers never silently upload the original image.
 */
export async function convertImageToWebp(file: File, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be converted to WebP.");
  }
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }
  if (file.type === "image/webp") return file;

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result && result.type === "image/webp") resolve(result);
        else reject(new Error("Could not convert this image to WebP. Please try another image or browser."));
      }, "image/webp", quality);
    });
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
