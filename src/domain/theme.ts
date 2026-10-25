import { z } from "zod";

const Color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const ThemeTokens = z.object({
  surface: Color,
  surfaceSunken: Color,
  border: Color,
  ink: Color,
  muted: Color,
  accent: Color,
  accentSoft: Color,
  line: Color,
  dot: Color,
  frame: Color,
  frameBar: Color,
  deviceBody: Color,
  shadow: Color,
  shadowOpacity: z.number().min(0).max(1),
  /** Contribution levels from none to the busiest quartile. */
  activity: z.tuple([Color, Color, Color, Color, Color]),
});

export const ThemesSchema = z.object({ light: ThemeTokens, dark: ThemeTokens });

export type Theme = z.infer<typeof ThemeTokens>;
export type Themes = z.infer<typeof ThemesSchema>;
export type ThemeName = keyof Themes;
export const THEME_NAMES = ["light", "dark"] as const satisfies readonly ThemeName[];
