import type { ThemeName } from "../domain/theme.js";

/** One place that names every generated file, shared by the generator and the README links. */
export const GENERATED_PATHS = {
  readme: "README.md",
  banner: (theme: ThemeName) => `assets/generated/banner-${theme}.svg`,
  showcase: (theme: ThemeName) => `assets/generated/showcase-${theme}.svg`,
} as const;
