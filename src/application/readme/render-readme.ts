import type { Platform, Profile, Project } from "../../domain/profile.js";
import type { ThemeName } from "../../domain/theme.js";
import { GENERATED_PATHS } from "../artifacts.js";

export interface RepositoryFacts {
  readonly stars?: number;
}

export interface ReadmeInput {
  readonly profile: Profile;
  /** Live facts about open source repositories; a missing entry simply hides the number. */
  readonly repositories: ReadonlyMap<string, RepositoryFacts>;
}

const SEPARATOR = " · ";

function themedPicture(light: string, dark: string, alt: string): string {
  return [
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${dark}">`,
    `  <img src="${light}" width="100%" alt="${alt}">`,
    "</picture>",
  ].join("\n");
}

function centered(html: string): string {
  return `<p align="center">${html}</p>`;
}

function link(label: string, url: string): string {
  return `<a href="${url}">${label}</a>`;
}

function stackLine(stack: readonly string[]): string {
  return `<br><sub>${stack.join(SEPARATOR)}</sub>`;
}

function projectItem(project: Project, profile: Profile): string {
  const name = project.repo === undefined ? `**${project.name}**` : `[**${project.name}**](${project.repo})`;
  const links = [
    ...(project.demo === undefined ? [] : [`[${profile.copy.liveDemo}](${project.demo})`]),
    ...(project.repo === undefined ? [`<i>${profile.copy.privateCode}</i>`] : []),
  ];
  return `  - ${name}, ${project.summary}${SEPARATOR}${links.join(SEPARATOR)}${stackLine(project.stack)}`;
}

function platformItem(platform: Platform, profile: Profile, projects: ReadonlyMap<string, Project>): string {
  const lines = [`- **${platform.title}**`];
  for (const id of platform.projects) {
    const project = projects.get(id);
    if (project !== undefined) lines.push(projectItem(project, profile));
  }
  if (platform.nda !== undefined) {
    lines.push(`  - ${platform.nda.summary}${SEPARATOR}<i>${profile.copy.nda}</i>${stackLine(platform.nda.stack)}`);
  }
  return lines.join("\n");
}

function openSourceItem(repo: string, summary: string, facts: RepositoryFacts | undefined): string {
  const stars = facts?.stars === undefined ? "" : ` ★${facts.stars}`;
  return `- [${repo}](https://github.com/${repo})${stars}${SEPARATOR}${summary}`;
}

function activityUrl(profile: Profile, theme: ThemeName): string {
  const { owner, branch } = profile.activity;
  return `https://raw.githubusercontent.com/${owner}/${owner}/${branch}/${GENERATED_PATHS.activity(theme)}`;
}

export function renderReadme({ profile, repositories }: ReadmeInput): string {
  const { identity, copy } = profile;
  const projects = new Map(profile.projects.map((project) => [project.id, project]));
  const sections = [
    `<!-- ${copy.generatedNotice} -->`,
    themedPicture(GENERATED_PATHS.banner("light"), GENERATED_PATHS.banner("dark"), copy.bannerAlt),
    centered(`<b>${identity.promise}</b>`),
    centered(identity.facts.join(SEPARATOR)),
    centered(profile.contacts.map((contact) => link(contact.label, contact.url)).join(SEPARATOR)),
    `## ${copy.build}`,
    themedPicture(GENERATED_PATHS.showcase("light"), GENERATED_PATHS.showcase("dark"), copy.showcaseAlt),
    profile.platforms.map((platform) => platformItem(platform, profile, projects)).join("\n"),
    `## ${copy.work}`,
    profile.principles.map((principle) => `- **${principle.title}:** ${principle.text}`).join("\n"),
    `## ${copy.activity}`,
    themedPicture(activityUrl(profile, "light"), activityUrl(profile, "dark"), copy.activityAlt),
  ];
  if (profile.openSource.length > 0) {
    sections.push(
      `## ${copy.openSource}`,
      profile.openSource.map((item) => openSourceItem(item.repo, item.summary, repositories.get(item.repo))).join("\n"),
    );
  }
  return sections.join("\n\n") + "\n";
}
