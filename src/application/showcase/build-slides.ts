import type { Profile } from "../../domain/profile.js";
import type { ThemeName } from "../../domain/theme.js";
import type { ImageSource } from "../ports.js";
import type { ShowcaseDeck } from "./render-showcase.js";

/** A screenshot without a dark variant is shown as is in the dark theme. */
export async function buildDecks(profile: Profile, theme: ThemeName, images: ImageSource): Promise<readonly ShowcaseDeck[]> {
  const names = new Map(profile.projects.map((project) => [project.id, project.name]));
  return Promise.all(
    profile.showcase.map(async (device) => {
      const paths = device.slides.map((slide) => (theme === "dark" ? slide.image.dark : undefined) ?? slide.image.light);
      const [hrefs, firstSize] = await Promise.all([Promise.all(paths.map((path) => images.dataUri(path))), images.size(paths[0] ?? "")]);
      return {
        device: device.device,
        aspect: firstSize.width / firstSize.height,
        slides: device.slides.map((slide, index) => ({ href: hrefs[index] ?? "", label: names.get(slide.project) ?? slide.project })),
      };
    }),
  );
}
