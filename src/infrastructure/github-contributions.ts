import { z } from "zod";
import type { ContributionCalendar, ContributionLevel } from "../domain/activity.js";
import type { Logger } from "./logger.js";

const GRAPHQL = "https://api.github.com/graphql";
const TIMEOUT_MS = 15_000;

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
} as const satisfies Record<string, ContributionLevel>;

const Response = z.object({
  data: z.object({
    user: z.object({
      contributionsCollection: z.object({
        contributionCalendar: z.object({
          totalContributions: z.number().int().nonnegative(),
          weeks: z.array(
            z.object({
              contributionDays: z.array(
                z.object({
                  date: z.string(),
                  contributionCount: z.number().int().nonnegative(),
                  contributionLevel: z.enum(Object.keys(LEVELS) as [keyof typeof LEVELS, ...(keyof typeof LEVELS)[]]),
                }),
              ),
            }),
          ),
        }),
      }),
    }),
  }),
});

/** Reads the public contribution calendar, which includes private work as anonymous counts when the owner allows it. */
export class GitHubContributions {
  constructor(
    private readonly token: string,
    private readonly logger: Logger,
  ) {}

  async calendar(login: string): Promise<ContributionCalendar> {
    const response = await fetch(GRAPHQL, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`GitHub GraphQL answered ${response.status}`);
    const calendar = Response.parse(await response.json()).data.user.contributionsCollection.contributionCalendar;
    this.logger.info("github.contributions.loaded", { login, total: calendar.totalContributions, weeks: calendar.weeks.length });
    return {
      total: calendar.totalContributions,
      weeks: calendar.weeks.map((week) =>
        week.contributionDays.map((day) => ({ date: day.date, count: day.contributionCount, level: LEVELS[day.contributionLevel] })),
      ),
    };
  }
}
