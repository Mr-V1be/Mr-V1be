import type { Profile } from "../../domain/profile.js";
import type { ThemeName } from "../../domain/theme.js";
import type { ImageSource } from "../ports.js";
import type { ShowcaseSlide } from "./render-showcase.js";

/** A screenshot without a dark variant is shown as is in the dark theme. */
export async function buildSlides(profile: Profile, theme: ThemeName, images: ImageSource): Promise<readonly ShowcaseSlide[]> {
  return Promise.all(
    profile.showcase.map(async (item) => {
      const path = (theme === "dark" ? item.image.dark : undefined) ?? item.image.light;
      const [href, size] = await Promise.all([images.dataUri(path), images.size(path)]);
      return { device: item.device, href, aspect: size.width / size.height };
    }),
  );
}
