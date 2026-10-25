import type { ThemeName } from "../domain/theme.js";

/** One place that names every generated file, shared by the generator and the README links. */
export const GENERATED_PATHS = {
  readme: "README.md",
  banner: (theme: ThemeName) => `assets/generated/banner-${theme}.svg`,
  showcase: (theme: ThemeName) => `assets/generated/showcase-${theme}.svg`,
  /** Refreshed daily and published to the live branch, never committed to main. */
  activity: (theme: ThemeName) => `live/activity-${theme}.svg`,
} as const;
