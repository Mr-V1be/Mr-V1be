import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Artifact, ArtifactSink } from "../application/ports.js";

export class FsArtifactSink implements ArtifactSink {
  constructor(private readonly root: string) {}

  async publish(artifacts: readonly Artifact[]): Promise<readonly string[]> {
    const changed: string[] = [];
    for (const artifact of artifacts) {
      const target = join(this.root, artifact.path);
      const current = await readFile(target, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return undefined;
        throw error;
      });
      if (current === artifact.content) continue;
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, artifact.content, "utf8");
      changed.push(artifact.path);
    }
    return changed;
  }
}
