export function createMockImageFile(name: string, sizeBytes: number, type = "image/png") {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

export async function readFileAsBuffer(path: string) {
  const fs = await import("fs/promises");
  const data = await fs.readFile(path);
  return new File([data], path.split("/").pop() ?? "label.png", {
    type: "image/png",
    lastModified: Date.now(),
  });
}
