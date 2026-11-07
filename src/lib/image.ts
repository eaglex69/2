function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function resizeImage(file: File, max = 900, type: "image/jpeg" | "image/png" = "image/jpeg"): Promise<string> {
  const image = await readImage(file);
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.82);
}

// Квадратная обрезка по центру — для аватаров.
export async function cropSquare(file: File, size = 256): Promise<string> {
  const image = await readImage(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")!.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function fontToDataUrl(file: File): Promise<string> {
  const data = await fileToDataUrl(file);
  const extension = file.name.toLowerCase().split(".").pop();
  const mime = extension === "woff2" ? "font/woff2" : extension === "woff" ? "font/woff" : extension === "otf" ? "font/otf" : "font/ttf";
  return data.replace(/^data:[^;]*;/, `data:${mime};`);
}
