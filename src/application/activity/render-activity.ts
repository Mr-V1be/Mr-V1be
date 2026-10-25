import type { ContributionCalendar, ContributionDay } from "../../domain/activity.js";
import type { Profile } from "../../domain/profile.js";
import type { Theme } from "../../domain/theme.js";
import { shade } from "../color.js";
import type { TextOutliner, TextStyle } from "../ports.js";
import { el, num, svgDocument } from "../svg-markup.js";

const CANVAS = { width: 1280, height: 440, radius: 28 } as const;

/**
 * Cabinet projection: weeks run straight along the x axis and weekdays recede up and to the right,
 * so a whole year reads as one calm skyline across a wide banner.
 */
const GRID = { originX: 92, originY: 404, week: 20, depth: { x: 7, y: 7 }, fill: 0.78 } as const;
const BAR = { maxHeight: 118, minHeight: 3, emptyHeight: 1.5 } as const;
const SIDES = { front: 0.2, right: 0.38 } as const;
const TEXT = { x: 84, totalBaseline: 116, labelGap: 42, noteGap: 32 } as const;
const MOTION = { riseSeconds: 0.9, stepSeconds: 0.012 } as const;

const TYPE = {
  total: { role: "display", size: 64, letterSpacing: -0.02 },
  label: { role: "heading", size: 22 },
  note: { role: "mono", size: 15, letterSpacing: 0.02 },
} as const satisfies Record<string, TextStyle>;

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

interface Cell {
  readonly week: number;
  readonly weekday: number;
  readonly day: ContributionDay;
}

function point(week: number, weekday: number): { x: number; y: number } {
  return {
    x: GRID.originX + week * GRID.week + weekday * GRID.depth.x,
    y: GRID.originY - weekday * GRID.depth.y,
  };
}

function polygon(points: readonly { x: number; y: number }[], fill: string): string {
  return el("polygon", { points: points.map((p) => `${num(p.x)},${num(p.y)}`).join(" "), fill });
}

function barHeight(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return BAR.emptyHeight;
  // Square root keeps quiet days visible next to the busiest ones.
  return Math.max(BAR.minHeight, BAR.maxHeight * Math.sqrt(count / maxCount));
}

function prism(cell: Cell, maxCount: number, palette: readonly string[]): string {
  // Each block covers part of its cell, leaving thin gutters so neighbouring days stay distinct.
  const inset = (1 - GRID.fill) / 2;
  const w0 = cell.week + inset;
  const w1 = cell.week + 1 - inset;
  const d0 = cell.weekday + inset;
  const d1 = cell.weekday + 1 - inset;
  const frontLeft = point(w0, d0);
  const frontRight = point(w1, d0);
  const backRight = point(w1, d1);
  const backLeft = point(w0, d1);
  const height = barHeight(cell.day.count, maxCount);
  const lift = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - height });
  const color = palette[cell.day.level] ?? palette[0] ?? "#000000";
  return el("g", { class: "bar", style: `animation-delay:${num(cell.week * MOTION.stepSeconds)}s` }, [
    polygon([lift(frontLeft), lift(frontRight), frontRight, frontLeft], shade(color, SIDES.front)),
    polygon([lift(frontRight), lift(backRight), backRight, frontRight], shade(color, SIDES.right)),
    polygon([lift(frontLeft), lift(frontRight), lift(backRight), lift(backLeft)], color),
  ]);
}

/** Back rows first, and left to right within a row, so every block covers the right face of its left neighbour. */
function drawingOrder(calendar: ContributionCalendar): Cell[] {
  const cells = calendar.weeks.flatMap((days, week) => days.map((day, weekday) => ({ week, weekday, day })));
  return cells.sort((a, b) => b.weekday - a.weekday || a.week - b.week);
}

export function renderActivity(calendar: ContributionCalendar, profile: Profile, theme: Theme, outliner: TextOutliner): string {
  const maxCount = Math.max(0, ...calendar.weeks.flatMap((days) => days.map((day) => day.count)));
  const labelBaseline = TEXT.totalBaseline + TEXT.labelGap;
  return svgDocument(CANVAS.width, CANVAS.height, profile.copy.activityAlt, [
    el("style", {}, [
      `.bar{transform-box:fill-box;transform-origin:bottom;animation:rise ${MOTION.riseSeconds}s cubic-bezier(.2,.8,.2,1) both}`,
      `@keyframes rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}`,
      `@media (prefers-reduced-motion:reduce){.bar{animation:none}}`,
    ]),
    el("rect", { x: 0.75, y: 0.75, width: CANVAS.width - 1.5, height: CANVAS.height - 1.5, rx: CANVAS.radius, fill: theme.surfaceSunken, stroke: theme.border, "stroke-width": 1.5 }),
    el("path", { d: outliner.outline(NUMBER_FORMAT.format(calendar.total), TEXT.x, TEXT.totalBaseline, TYPE.total).d, fill: theme.ink }),
    el("path", { d: outliner.outline(profile.copy.activityTotal, TEXT.x, labelBaseline, TYPE.label).d, fill: theme.ink }),
    el("path", { d: outliner.outline(profile.copy.activityNote, TEXT.x, labelBaseline + TEXT.noteGap, TYPE.note).d, fill: theme.muted }),
    ...drawingOrder(calendar).map((cell) => prism(cell, maxCount, theme.activity)),
  ]);
}
