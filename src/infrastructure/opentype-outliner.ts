import { readFile } from "node:fs/promises";
import { join } from "node:path";
import opentype from "opentype.js";
import type { FontRole, OutlinedText, TextOutliner, TextStyle } from "../application/ports.js";
import { num } from "../application/svg-markup.js";

export type FontFiles = Readonly<Record<FontRole, string>>;

/**
 * Serialises glyph commands ourselves: opentype.js 2.0 `toPathData` emits NaN for some rounded coordinates,
 * which silently truncates the rest of the path in every renderer.
 */
function pathData(path: opentype.Path): string {
  return path.commands
    .map((command) => {
      switch (command.type) {
        case "M":
        case "L":
          return `${command.type}${num(command.x)} ${num(command.y)}`;
        case "Q":
          return `Q${num(command.x1)} ${num(command.y1)} ${num(command.x)} ${num(command.y)}`;
        case "C":
          return `C${num(command.x1)} ${num(command.y1)} ${num(command.x2)} ${num(command.y2)} ${num(command.x)} ${num(command.y)}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}

export class OpentypeOutliner implements TextOutliner {
  private constructor(private readonly fonts: ReadonlyMap<FontRole, opentype.Font>) {}

  static async load(root: string, files: FontFiles): Promise<OpentypeOutliner> {
    const entries = await Promise.all(
      (Object.entries(files) as [FontRole, string][]).map(async ([role, file]) => {
        const buffer = await readFile(join(root, file));
        const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        return [role, font] as const;
      }),
    );
    return new OpentypeOutliner(new Map(entries));
  }

  measure(text: string, style: TextStyle): number {
    return this.font(style.role).getAdvanceWidth(text, style.size, this.options(style));
  }

  outline(text: string, x: number, baseline: number, style: TextStyle): OutlinedText {
    const font = this.font(style.role);
    const options = this.options(style);
    return {
      d: pathData(font.getPath(text, x, baseline, style.size, options)),
      width: font.getAdvanceWidth(text, style.size, options),
    };
  }

  private options(style: TextStyle): opentype.RenderOptions {
    return { kerning: true, ...(style.letterSpacing === undefined ? {} : { letterSpacing: style.letterSpacing }) };
  }

  private font(role: FontRole): opentype.Font {
    const font = this.fonts.get(role);
    if (font === undefined) throw new Error(`No font registered for role ${role}`);
    return font;
  }
}
