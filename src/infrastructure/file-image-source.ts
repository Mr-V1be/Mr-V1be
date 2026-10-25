import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { imageSize } from "image-size";
import type { ImageSource } from "../application/ports.js";

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export class FileImageSource implements ImageSource {
  constructor(private readonly root: string) {}

  async dataUri(path: string): Promise<string> {
    const mime = MIME_BY_EXTENSION[extname(path).toLowerCase()];
    if (mime === undefined) throw new Error(`Unsupported image type: ${path}`);
    const bytes = await readFile(join(this.root, path));
    return `data:${mime};base64,${bytes.toString("base64")}`;
  }

  async size(path: string): Promise<{ width: number; height: number }> {
    const { width, height } = imageSize(await readFile(join(this.root, path)));
    if (width === undefined || height === undefined) throw new Error(`Cannot read the size of ${path}`);
    return { width, height };
  }
}
