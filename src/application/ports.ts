export type FontRole = "display" | "heading" | "mono";

export interface OutlinedText {
  /** SVG path data with the glyphs placed at the requested origin. */
  readonly d: string;
  readonly width: number;
}

export interface TextStyle {
  readonly role: FontRole;
  readonly size: number;
  /** Extra space between letters, in em. */
  readonly letterSpacing?: number;
}

/** Images are served by GitHub without access to web fonts, so every text becomes outlines. */
export interface TextOutliner {
  measure(text: string, style: TextStyle): number;
  outline(text: string, x: number, baseline: number, style: TextStyle): OutlinedText;
}

export interface ImageSource {
  /** Returns the image as a data URI, so the SVG stays self-contained. */
  dataUri(path: string): Promise<string>;
  size(path: string): Promise<{ width: number; height: number }>;
}

export interface Artifact {
  readonly path: string;
  readonly content: string;
}

export interface ArtifactSink {
  /** Writes only changed files and reports which ones changed. */
  publish(artifacts: readonly Artifact[]): Promise<readonly string[]>;
}
