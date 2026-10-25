import { z } from "zod";

const Url = z.string().min(1);

const LiveProof = z.object({
  kind: z.literal("live"),
  name: z.string().min(1),
  summary: z.string().min(1),
  repo: Url,
  demo: Url,
});

// Client work under NDA: described, never linked to client code.
const NdaProof = z.object({
  kind: z.literal("nda"),
  summary: z.string().min(1),
});

const Platform = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  // Present only for client surfaces that orbit the backend on the banner.
  node: z.string().min(1).optional(),
  stack: z.array(z.string().min(1)).min(1),
  proof: z.discriminatedUnion("kind", [LiveProof, NdaProof]),
});

const ThemedImage = z.object({
  light: z.string().min(1),
  dark: z.string().min(1).optional(),
});

const Device = z.enum(["browser", "phone"]);

const ShowcaseItem = z.object({
  platform: z.string().min(1),
  device: Device,
  image: ThemedImage,
});

export const ProfileSchema = z
  .object({
    identity: z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      promise: z.string().min(1),
      facts: z.array(z.string().min(1)).min(1),
    }),
    contacts: z.array(z.object({ label: z.string().min(1), url: Url })).min(1),
    banner: z.object({ core: z.string().min(1), caption: z.string().min(1) }),
    copy: z.object({
      generatedNotice: z.string().min(1),
      bannerAlt: z.string().min(1),
      build: z.string().min(1),
      showcaseAlt: z.string().min(1),
      liveDemo: z.string().min(1),
      nda: z.string().min(1),
      work: z.string().min(1),
      activity: z.string().min(1),
      activityAlt: z.string().min(1),
      activityTotal: z.string().min(1),
      activityNote: z.string().min(1),
      openSource: z.string().min(1),
    }),
    platforms: z.array(Platform).min(1),
    showcase: z.array(ShowcaseItem),
    principles: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })),
    openSource: z.array(z.object({ repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/), summary: z.string().min(1) })),
    // Live images are published to a separate branch so the daily refresh stays out of the main history.
    activity: z.object({ owner: z.string().min(1), branch: z.string().min(1) }),
  })
  .superRefine((profile, ctx) => {
    const ids = new Set(profile.platforms.map((platform) => platform.id));
    if (ids.size !== profile.platforms.length) {
      ctx.addIssue({ code: "custom", path: ["platforms"], message: "platform ids must be unique" });
    }
    profile.showcase.forEach((item, index) => {
      if (!ids.has(item.platform)) {
        ctx.addIssue({ code: "custom", path: ["showcase", index, "platform"], message: `unknown platform ${item.platform}` });
      }
    });
  });

export type Profile = z.infer<typeof ProfileSchema>;
export type Platform = Profile["platforms"][number];
export type ShowcaseItem = Profile["showcase"][number];
export type DeviceKind = z.infer<typeof Device>;
