import { el, num } from "../svg-markup.js";

/** How long a slide stays on screen and how long two slides cross-fade, in seconds. */
const CYCLE = { slideSeconds: 4.5, fadeSeconds: 0.9 } as const;

const PERCENT = 100;

const cycleClass = (count: number) => `cycle-${count}`;

/**
 * One keyframe set per deck size: a slide is visible for its share of the loop and cross-fades with the
 * next one. Without motion only the first slide shows, because the others start hidden.
 */
export function cycleStyles(deckSizes: readonly number[]): string {
  const sizes = [...new Set(deckSizes)].filter((count) => count > 1);
  const rules = sizes.flatMap((count) => {
    const loop = count * CYCLE.slideSeconds;
    const visible = (CYCLE.slideSeconds / loop) * PERCENT;
    const fade = (CYCLE.fadeSeconds / loop) * PERCENT;
    const name = cycleClass(count);
    return [
      `.${name}{animation:${name} ${num(loop)}s linear infinite}`,
      `@keyframes ${name}{0%{opacity:1}${num(visible - fade)}%{opacity:1}${num(visible)}%{opacity:0}${num(PERCENT - fade)}%{opacity:0}100%{opacity:1}}`,
    ];
  });
  if (rules.length === 0) return "";
  const names = sizes.map((count) => `.${cycleClass(count)}`).join(",");
  return el("style", {}, [...rules, `.slide-later{opacity:0}`, `@media (prefers-reduced-motion:reduce){${names}{animation:none}}`]);
}

/**
 * Attributes that put a slide on its turn in the loop. A negative delay starts every slide mid-loop at
 * once, so the deck runs from the first frame with slide 0 on screen.
 */
export function slideAttributes(index: number, count: number): Record<string, string> {
  if (count <= 1) return {};
  const loop = count * CYCLE.slideSeconds;
  const delay = index === 0 ? 0 : index * CYCLE.slideSeconds - loop;
  return {
    class: index === 0 ? cycleClass(count) : `${cycleClass(count)} slide-later`,
    style: `animation-delay:${num(delay)}s`,
  };
}
