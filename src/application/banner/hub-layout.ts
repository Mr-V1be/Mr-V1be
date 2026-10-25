export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface HubSpec {
  readonly center: Point;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly coreRadius: number;
  readonly nodeHeight: number;
  /** Angle of the first node in degrees, measured clockwise from the positive x axis. */
  readonly startAngle: number;
  /** Gap between a connector and the shapes it joins. */
  readonly connectorGap: number;
}

export interface PlacedNode {
  readonly label: string;
  readonly center: Point;
  readonly width: number;
  readonly height: number;
  readonly connector: { readonly from: Point; readonly to: Point };
}

const FULL_TURN = 360;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distance from a rectangle centre to its edge along a unit direction. */
function distanceToEdge(width: number, height: number, dx: number, dy: number): number {
  const byWidth = dx === 0 ? Number.POSITIVE_INFINITY : width / 2 / Math.abs(dx);
  const byHeight = dy === 0 ? Number.POSITIVE_INFINITY : height / 2 / Math.abs(dy);
  return Math.min(byWidth, byHeight);
}

/** Spreads the nodes evenly on an ellipse around the core; any number of nodes fits without code changes. */
export function layoutHub(nodes: readonly { label: string; width: number }[], spec: HubSpec): readonly PlacedNode[] {
  const step = FULL_TURN / nodes.length;
  return nodes.map((node, index) => {
    const angle = radians(spec.startAngle + index * step);
    const center = { x: spec.center.x + spec.radiusX * Math.cos(angle), y: spec.center.y + spec.radiusY * Math.sin(angle) };
    const vx = center.x - spec.center.x;
    const vy = center.y - spec.center.y;
    const length = Math.hypot(vx, vy);
    const dx = vx / length;
    const dy = vy / length;
    const fromDistance = spec.coreRadius + spec.connectorGap;
    const toDistance = distanceToEdge(node.width, spec.nodeHeight, dx, dy) + spec.connectorGap;
    return {
      label: node.label,
      center,
      width: node.width,
      height: spec.nodeHeight,
      connector: {
        from: { x: spec.center.x + dx * fromDistance, y: spec.center.y + dy * fromDistance },
        to: { x: center.x - dx * toDistance, y: center.y - dy * toDistance },
      },
    };
  });
}
