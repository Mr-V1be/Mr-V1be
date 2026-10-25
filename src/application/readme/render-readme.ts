import type { Platform, Profile } from "../../domain/profile.js";
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

function platformItem(platform: Platform, profile: Profile): string {
  const proof =
    platform.proof.kind === "live"
      ? `[${platform.proof.name}](${platform.proof.repo}), ${platform.proof.summary}${SEPARATOR}[${profile.copy.liveDemo}](${platform.proof.demo})`
      : `${platform.proof.summary}${SEPARATOR}<i>${profile.copy.nda}</i>`;
  return `- **${platform.title}**${SEPARATOR}${proof}<br><sub>${platform.stack.join(SEPARATOR)}</sub>`;
}

function openSourceItem(repo: string, summary: string, facts: RepositoryFacts | undefined): string {
  const stars = facts?.stars === undefined ? "" : ` ★${facts.stars}`;
  return `- [${repo}](https://github.com/${repo})${stars}${SEPARATOR}${summary}`;
}

function activityUrl(profile: Profile, file: string): string {
  return `https://raw.githubusercontent.com/${profile.activity.owner}/${profile.activity.owner}/${profile.activity.branch}/${file}`;
}

export function renderReadme({ profile, repositories }: ReadmeInput): string {
  const { identity, copy } = profile;
  const sections = [
    `<!-- ${copy.generatedNotice} -->`,
    themedPicture(GENERATED_PATHS.banner("light"), GENERATED_PATHS.banner("dark"), copy.bannerAlt),
    centered(`<b>${identity.promise}</b>`),
    centered(identity.facts.join(SEPARATOR)),
    centered(profile.contacts.map((contact) => link(contact.label, contact.url)).join(SEPARATOR)),
    `## ${copy.build}`,
    themedPicture(GENERATED_PATHS.showcase("light"), GENERATED_PATHS.showcase("dark"), copy.showcaseAlt),
    profile.platforms.map((platform) => platformItem(platform, profile)).join("\n"),
    `## ${copy.work}`,
    profile.principles.map((principle) => `- **${principle.title}:** ${principle.text}`).join("\n"),
    `## ${copy.activity}`,
    themedPicture(activityUrl(profile, profile.activity.light), activityUrl(profile, profile.activity.dark), copy.activityAlt),
  ];
  if (profile.openSource.length > 0) {
    sections.push(
      `## ${copy.openSource}`,
      profile.openSource.map((item) => openSourceItem(item.repo, item.summary, repositories.get(item.repo))).join("\n"),
    );
  }
  return sections.join("\n\n") + "\n";
}
