import type { DeviceKind } from "../../domain/profile.js";
import type { Theme } from "../../domain/theme.js";
import { el, svgDocument } from "../svg-markup.js";

export interface ShowcaseSlide {
  readonly device: DeviceKind;
  readonly href: string;
  /** Width divided by height of the screenshot. */
  readonly aspect: number;
}

interface Frame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface DeviceStrategy {
  /** Devices drawn later stay on top where slots overlap. */
  readonly layer: number;
  width(slotWidth: number): number;
  height(width: number, aspect: number): number;
  draw(frame: Frame, slide: ShowcaseSlide, clipId: string, theme: Theme): string;
}

const CANVAS = { width: 1280, height: 540, margin: 40 } as const;
const SHADOW = { dy: 20, blur: 24 } as const;

const BROWSER = { slotScale: 1.4, bar: 34, radius: 14, dotRadius: 5, dotStart: 20, dotStep: 17, address: { inset: 9, widthShare: 0.4 } } as const;
const PHONE = { slotScale: 0.58, bezel: 10, radius: 38, screenRadius: 29, statusBar: 30, island: { width: 70, height: 20, top: 6 } } as const;

const DEVICES: Readonly<Record<DeviceKind, DeviceStrategy>> = {
  browser: {
    layer: 0,
    width: (slotWidth) => slotWidth * BROWSER.slotScale,
    height: (width, aspect) => width / aspect + BROWSER.bar,
    draw: ({ x, y, width, height }, slide, clipId, theme) => {
      const addressWidth = width * BROWSER.address.widthShare;
      return el("g", {}, [
        el("defs", {}, [el("clipPath", { id: clipId }, [el("rect", { x, y, width, height, rx: BROWSER.radius })])]),
        el("rect", { x, y, width, height, rx: BROWSER.radius, fill: theme.frame, filter: "url(#shadow)" }),
        el("g", { "clip-path": `url(#${clipId})` }, [
          el("rect", { x, y, width, height: BROWSER.bar, fill: theme.frameBar }),
          ...[0, 1, 2].map((index) =>
            el("circle", { cx: x + BROWSER.dotStart + index * BROWSER.dotStep, cy: y + BROWSER.bar / 2, r: BROWSER.dotRadius, fill: theme.line }),
          ),
          el("rect", {
            x: x + (width - addressWidth) / 2,
            y: y + BROWSER.address.inset,
            width: addressWidth,
            height: BROWSER.bar - BROWSER.address.inset * 2,
            rx: (BROWSER.bar - BROWSER.address.inset * 2) / 2,
            fill: theme.surface,
          }),
          el("image", { href: slide.href, x, y: y + BROWSER.bar, width, height: height - BROWSER.bar, preserveAspectRatio: "xMidYMin slice" }),
        ]),
        el("rect", { x, y, width, height, rx: BROWSER.radius, fill: "none", stroke: theme.border, "stroke-width": 1.5 }),
      ]);
    },
  },
  phone: {
    layer: 1,
    width: (slotWidth) => slotWidth * PHONE.slotScale,
    height: (width, aspect) => (width - PHONE.bezel * 2) / aspect + PHONE.bezel * 2 + PHONE.statusBar,
    draw: ({ x, y, width, height }, slide, clipId, theme) => {
      const screen = { x: x + PHONE.bezel, y: y + PHONE.bezel, width: width - PHONE.bezel * 2, height: height - PHONE.bezel * 2 };
      return el("g", {}, [
        el("defs", {}, [el("clipPath", { id: clipId }, [el("rect", { ...screen, rx: PHONE.screenRadius })])]),
        el("rect", { x, y, width, height, rx: PHONE.radius, fill: theme.deviceBody, filter: "url(#shadow)" }),
        // The status bar keeps the camera island off the app's own header.
        el("g", { "clip-path": `url(#${clipId})` }, [
          el("rect", { ...screen, fill: theme.frame }),
          el("image", {
            href: slide.href,
            x: screen.x,
            y: screen.y + PHONE.statusBar,
            width: screen.width,
            height: screen.height - PHONE.statusBar,
            preserveAspectRatio: "xMidYMin slice",
          }),
        ]),
        el("rect", {
          x: x + (width - PHONE.island.width) / 2,
          y: screen.y + PHONE.island.top,
          width: PHONE.island.width,
          height: PHONE.island.height,
          rx: PHONE.island.height / 2,
          fill: theme.deviceBody,
        }),
      ]);
    },
  },
};

/**
 * Spreads the device centres evenly between the canvas margins so the outer devices stay fully visible;
 * neighbours may overlap and phones stay on top.
 */
export function renderShowcase(slides: readonly ShowcaseSlide[], theme: Theme, title: string): string {
  const slotWidth = (CANVAS.width - CANVAS.margin * 2) / slides.length;
  const sized = slides.map((slide, index) => {
    const device = DEVICES[slide.device];
    const width = device.width(slotWidth);
    return { slide, device, index, width, height: device.height(width, slide.aspect) };
  });
  const firstCenter = CANVAS.margin + (sized[0]?.width ?? 0) / 2;
  const lastCenter = CANVAS.width - CANVAS.margin - (sized.at(-1)?.width ?? 0) / 2;
  const step = sized.length > 1 ? (lastCenter - firstCenter) / (sized.length - 1) : 0;
  const placed = sized.map(({ slide, device, index, width, height }) => {
    const centerX = sized.length > 1 ? firstCenter + step * index : CANVAS.width / 2;
    return { slide, device, index, frame: { x: centerX - width / 2, y: (CANVAS.height - height) / 2, width, height } };
  });
  const ordered = [...placed].sort((a, b) => a.device.layer - b.device.layer);
  return svgDocument(CANVAS.width, CANVAS.height, title, [
    el("defs", {}, [
      el("filter", { id: "shadow", x: "-30%", y: "-30%", width: "160%", height: "170%" }, [
        el("feDropShadow", { dx: 0, dy: SHADOW.dy, stdDeviation: SHADOW.blur, "flood-color": theme.shadow, "flood-opacity": theme.shadowOpacity }),
      ]),
    ]),
    ...ordered.map(({ slide, device, index, frame }) => device.draw(frame, slide, `screen-${index}`, theme)),
  ]);
}
