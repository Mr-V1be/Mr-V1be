import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED_PATHS } from "../application/artifacts.js";
import { renderBanner } from "../application/banner/render-banner.js";
import type { Artifact } from "../application/ports.js";
import { renderReadme } from "../application/readme/render-readme.js";
import { buildSlides } from "../application/showcase/build-slides.js";
import { renderShowcase } from "../application/showcase/render-showcase.js";
import { ProfileSchema } from "../domain/profile.js";
import { THEME_NAMES, ThemesSchema } from "../domain/theme.js";
import { FileImageSource } from "../infrastructure/file-image-source.js";
import { FsArtifactSink } from "../infrastructure/fs-artifact-sink.js";
import { GitHubRepositories } from "../infrastructure/github-repositories.js";
import { jsonLogger } from "../infrastructure/logger.js";
import { OpentypeOutliner } from "../infrastructure/opentype-outliner.js";
import { loadYaml } from "../infrastructure/yaml-config.js";

// Composition root: the only place that knows about files, fonts and the network.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = { profile: "profile/profile.yaml", themes: "profile/themes.yaml" } as const;
const FONTS = {
  display: "assets/fonts/Manrope-ExtraBold.ttf",
  heading: "assets/fonts/Manrope-Bold.ttf",
  mono: "assets/fonts/IBMPlexMono-Medium.ttf",
} as const;

async function main(): Promise<void> {
  const [profile, themes, outliner] = await Promise.all([
    loadYaml(ROOT, CONFIG.profile, ProfileSchema),
    loadYaml(ROOT, CONFIG.themes, ThemesSchema),
    OpentypeOutliner.load(ROOT, FONTS),
  ]);
  const images = new FileImageSource(ROOT);
  const repositories = await new GitHubRepositories(process.env.GITHUB_TOKEN, jsonLogger).facts(
    profile.openSource.map((item) => item.repo),
  );

  const themed = await Promise.all(
    THEME_NAMES.map(async (name): Promise<Artifact[]> => [
      { path: GENERATED_PATHS.banner(name), content: renderBanner(profile, themes[name], outliner) },
      { path: GENERATED_PATHS.showcase(name), content: renderShowcase(await buildSlides(profile, name, images), themes[name], profile.copy.showcaseAlt) },
    ]),
  );
  const artifacts = [...themed.flat(), { path: GENERATED_PATHS.readme, content: renderReadme({ profile, repositories }) }];

  const changed = await new FsArtifactSink(ROOT).publish(artifacts);
  jsonLogger.info("profile.generated", { artifacts: artifacts.length, changed });
}

main().catch((error: unknown) => {
  jsonLogger.warn("profile.failed", { error: error instanceof Error ? error.stack ?? error.message : String(error) });
  process.exitCode = 1;
});
