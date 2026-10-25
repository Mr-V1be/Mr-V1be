import type { Profile } from "../../domain/profile.js";
import type { Theme } from "../../domain/theme.js";
import type { TextOutliner, TextStyle } from "../ports.js";
import { el, num, svgDocument } from "../svg-markup.js";
import { layoutHub, type PlacedNode } from "./hub-layout.js";

const CANVAS = { width: 1280, height: 440, radius: 28 } as const;

const TYPE = {
  role: { role: "mono", size: 18, letterSpacing: 0.16 },
  name: { role: "display", size: 86, letterSpacing: -0.02 },
  caption: { role: "mono", size: 17, letterSpacing: 0.06 },
  node: { role: "mono", size: 17, letterSpacing: 0.02 },
  core: { role: "mono", size: 15, letterSpacing: 0.12 },
} as const satisfies Record<string, TextStyle>;

const TEXT_BLOCK = { x: 84, roleBaseline: 134, firstNameBaseline: 226, nameLineGap: 92, captionGap: 62 } as const;

const HUB = {
  center: { x: 968, y: 224 },
  radiusX: 214,
  radiusY: 146,
  coreRadius: 60,
  nodeHeight: 46,
  startAngle: -90,
  connectorGap: 8,
} as const;

const NODE = { paddingX: 22, dotRadius: 4, dotGap: 12 } as const;
const DOTS = { spacing: 22, radius: 1.3 } as const;
const MOTION = { flowSeconds: 1.8, flowStaggerSeconds: 0.35, pulseSeconds: 3.6, pulseRings: 2, blinkSeconds: 2.4 } as const;
// Dash and gap of the flowing connector; the offset animates by two periods so the loop is seamless.
const FLOW_DASH = { dash: 2, gap: 14 } as const;

function styles(): string {
  const period = FLOW_DASH.dash + FLOW_DASH.gap;
  return el("style", {}, [
    `.flow{animation:flow ${MOTION.flowSeconds}s linear infinite}`,
    `@keyframes flow{to{stroke-dashoffset:-${period * 2}}}`,
    `.pulse{transform-box:fill-box;transform-origin:center;animation:pulse ${MOTION.pulseSeconds}s ease-out infinite;opacity:0}`,
    `@keyframes pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.9);opacity:0}}`,
    `.blink{animation:blink ${MOTION.blinkSeconds}s ease-in-out infinite}`,
    `@keyframes blink{0%,100%{opacity:.35}50%{opacity:1}}`,
    `@media (prefers-reduced-motion:reduce){.flow,.pulse,.blink{animation:none}}`,
  ]);
}

function defs(theme: Theme): string {
  return el("defs", {}, [
    el("clipPath", { id: "canvas" }, [el("rect", { width: CANVAS.width, height: CANVAS.height, rx: CANVAS.radius })]),
    el("pattern", { id: "dots", width: DOTS.spacing, height: DOTS.spacing, patternUnits: "userSpaceOnUse" }, [
      el("circle", { cx: DOTS.spacing / 2, cy: DOTS.spacing / 2, r: DOTS.radius, fill: theme.dot }),
    ]),
    el(
      "radialGradient",
      { id: "fade", cx: HUB.center.x, cy: HUB.center.y, r: HUB.radiusX * 1.9, gradientUnits: "userSpaceOnUse" },
      [el("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 1 }), el("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 })],
    ),
    el("mask", { id: "dot-fade" }, [el("rect", { width: CANVAS.width, height: CANVAS.height, fill: "url(#fade)" })]),
  ]);
}

function textBlock(profile: Profile, theme: Theme, outliner: TextOutliner): string[] {
  const [first = profile.identity.name, ...rest] = profile.identity.name.split(" ");
  const lines = rest.length > 0 ? [first, rest.join(" ")] : [first];
  const nameBaselines = lines.map((_, index) => TEXT_BLOCK.firstNameBaseline + index * TEXT_BLOCK.nameLineGap);
  const captionBaseline = (nameBaselines.at(-1) ?? TEXT_BLOCK.firstNameBaseline) + TEXT_BLOCK.captionGap;
  return [
    el("path", { d: outliner.outline(profile.identity.role.toUpperCase(), TEXT_BLOCK.x, TEXT_BLOCK.roleBaseline, TYPE.role).d, fill: theme.accent }),
    ...lines.map((line, index) =>
      el("path", { d: outliner.outline(line, TEXT_BLOCK.x - 4, nameBaselines[index] ?? 0, TYPE.name).d, fill: theme.ink }),
    ),
    el("path", { d: outliner.outline(profile.banner.caption, TEXT_BLOCK.x, captionBaseline, TYPE.caption).d, fill: theme.muted }),
  ];
}

function centeredText(text: string, centerX: number, centerY: number, style: TextStyle, outliner: TextOutliner, fill: string): string {
  const width = outliner.measure(text, style) - (style.letterSpacing ?? 0) * style.size;
  // Cap height of both fonts is about 0.7 em, so this baseline centres the glyphs optically.
  const baseline = centerY + style.size * 0.35;
  return el("path", { d: outliner.outline(text, centerX - width / 2, baseline, style).d, fill });
}

function connector(node: PlacedNode, index: number, theme: Theme): string[] {
  const { from, to } = node.connector;
  const line = { x1: from.x, y1: from.y, x2: to.x, y2: to.y, "stroke-linecap": "round" };
  return [
    el("line", { ...line, stroke: theme.line, "stroke-width": 1.5 }),
    el("line", {
      ...line,
      class: "flow",
      stroke: theme.accent,
      "stroke-width": 2.4,
      "stroke-dasharray": `${FLOW_DASH.dash} ${FLOW_DASH.gap}`,
      style: `animation-delay:-${num(index * MOTION.flowStaggerSeconds)}s`,
    }),
  ];
}

function nodePill(node: PlacedNode, index: number, theme: Theme, outliner: TextOutliner): string {
  const left = node.center.x - node.width / 2;
  const top = node.center.y - node.height / 2;
  const dotX = left + NODE.paddingX + NODE.dotRadius;
  const labelX = dotX + NODE.dotRadius + NODE.dotGap;
  return el("g", {}, [
    el("rect", { x: left, y: top, width: node.width, height: node.height, rx: node.height / 2, fill: theme.surface, stroke: theme.border, "stroke-width": 1.5 }),
    el("circle", {
      class: "blink",
      cx: dotX,
      cy: node.center.y,
      r: NODE.dotRadius,
      fill: theme.accent,
      style: `animation-delay:-${num(index * MOTION.flowStaggerSeconds)}s`,
    }),
    el("path", { d: outliner.outline(node.label, labelX, node.center.y + TYPE.node.size * 0.35, TYPE.node).d, fill: theme.ink }),
  ]);
}

function core(profile: Profile, theme: Theme, outliner: TextOutliner): string[] {
  const { x, y } = HUB.center;
  const rings = Array.from({ length: MOTION.pulseRings }, (_, ring) =>
    el("circle", {
      class: "pulse",
      cx: x,
      cy: y,
      r: HUB.coreRadius,
      fill: "none",
      stroke: theme.accent,
      "stroke-width": 2,
      style: `animation-delay:-${num((ring * MOTION.pulseSeconds) / MOTION.pulseRings)}s`,
    }),
  );
  return [
    ...rings,
    el("circle", { cx: x, cy: y, r: HUB.coreRadius, fill: theme.accentSoft, stroke: theme.accent, "stroke-width": 2 }),
    centeredText(profile.banner.core.toUpperCase(), x, y, TYPE.core, outliner, theme.accent),
  ];
}

export function renderBanner(profile: Profile, theme: Theme, outliner: TextOutliner): string {
  const nodes = layoutHub(
    profile.platforms.flatMap((platform) =>
      platform.node === undefined
        ? []
        : [{ label: platform.node, width: outliner.measure(platform.node, TYPE.node) + NODE.paddingX * 2 + NODE.dotRadius * 2 + NODE.dotGap }],
    ),
    HUB,
  );
  return svgDocument(CANVAS.width, CANVAS.height, profile.copy.bannerAlt, [
    styles(),
    defs(theme),
    el("g", { "clip-path": "url(#canvas)" }, [
      el("rect", { width: CANVAS.width, height: CANVAS.height, fill: theme.surfaceSunken }),
      el("rect", { width: CANVAS.width, height: CANVAS.height, fill: "url(#dots)", mask: "url(#dot-fade)" }),
      ...textBlock(profile, theme, outliner),
      ...nodes.flatMap((node, index) => connector(node, index, theme)),
      ...core(profile, theme, outliner),
      ...nodes.map((node, index) => nodePill(node, index, theme, outliner)),
    ]),
    el("rect", { x: 0.75, y: 0.75, width: CANVAS.width - 1.5, height: CANVAS.height - 1.5, rx: CANVAS.radius, fill: "none", stroke: theme.border, "stroke-width": 1.5 }),
  ]);
}
