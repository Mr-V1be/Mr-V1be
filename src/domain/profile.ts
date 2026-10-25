import { z } from "zod";

const Url = z.string().min(1);

const Id = z.string().regex(/^[a-z0-9-]+$/);
const Stack = z.array(z.string().min(1)).min(1);

const Project = z.object({
  id: Id,
  name: z.string().min(1),
  summary: z.string().min(1),
  stack: Stack,
  // Both optional: client work may have a live demo but private code, or neither.
  repo: Url.optional(),
  demo: Url.optional(),
});

// Client work under NDA: described, never linked to client code.
const NdaWork = z.object({ summary: z.string().min(1), stack: Stack });

const Platform = z.object({
  id: Id,
  title: z.string().min(1),
  // Present only for client surfaces that orbit the backend on the banner.
  node: z.string().min(1).optional(),
  projects: z.array(Id).default([]),
  nda: NdaWork.optional(),
});

const ThemedImage = z.object({
  light: z.string().min(1),
  dark: z.string().min(1).optional(),
});

const Device = z.enum(["browser", "phone"]);

const ShowcaseItem = z.object({
  project: Id,
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
      privateCode: z.string().min(1),
      work: z.string().min(1),
      activity: z.string().min(1),
      activityAlt: z.string().min(1),
      activityTotal: z.string().min(1),
      activityNote: z.string().min(1),
      openSource: z.string().min(1),
    }),
    projects: z.array(Project).min(1),
    platforms: z.array(Platform).min(1),
    showcase: z.array(ShowcaseItem),
    principles: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })),
    openSource: z.array(z.object({ repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/), summary: z.string().min(1) })),
    // Live images are published to a separate branch so the daily refresh stays out of the main history.
    activity: z.object({ owner: z.string().min(1), branch: z.string().min(1) }),
  })
  .superRefine((profile, ctx) => {
    const unique = (path: string, ids: readonly string[]) => {
      if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: [path], message: `${path} ids must be unique` });
    };
    unique("projects", profile.projects.map((project) => project.id));
    unique("platforms", profile.platforms.map((platform) => platform.id));
    const projects = new Set(profile.projects.map((project) => project.id));
    const known = (id: string, path: (string | number)[]) => {
      if (!projects.has(id)) ctx.addIssue({ code: "custom", path, message: `unknown project ${id}` });
    };
    profile.platforms.forEach((platform, index) => {
      platform.projects.forEach((id, at) => known(id, ["platforms", index, "projects", at]));
      if (platform.projects.length === 0 && platform.nda === undefined) {
        ctx.addIssue({ code: "custom", path: ["platforms", index], message: "a platform needs projects or NDA work" });
      }
    });
    profile.showcase.forEach((item, index) => known(item.project, ["showcase", index, "project"]));
  });

export type Profile = z.infer<typeof ProfileSchema>;
export type Platform = Profile["platforms"][number];
export type Project = Profile["projects"][number];
export type ShowcaseItem = Profile["showcase"][number];
export type DeviceKind = z.infer<typeof Device>;
