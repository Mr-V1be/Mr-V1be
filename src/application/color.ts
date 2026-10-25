const CHANNEL_MAX = 255;

/** Darkens a #RRGGBB color towards black by the given share, used for the shaded sides of a prism. */
export function shade(hex: string, share: number): string {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels
    .map((channel) => Math.round(Math.min(CHANNEL_MAX, Math.max(0, channel * (1 - share)))).toString(16).padStart(2, "0"))
    .join("")}`;
}
