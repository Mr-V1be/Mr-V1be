import type { RepositoryFacts } from "../application/readme/render-readme.js";
import type { Logger } from "./logger.js";

const API = "https://api.github.com";
const TIMEOUT_MS = 8_000;

/** Reads public repository facts; a failure degrades to "no number shown" and is logged, never hidden. */
export class GitHubRepositories {
  constructor(
    private readonly token: string | undefined,
    private readonly logger: Logger,
  ) {}

  async facts(repos: readonly string[]): Promise<ReadonlyMap<string, RepositoryFacts>> {
    const entries = await Promise.all(repos.map(async (repo) => [repo, await this.fetchFacts(repo)] as const));
    return new Map(entries);
  }

  private async fetchFacts(repo: string): Promise<RepositoryFacts> {
    try {
      const response = await fetch(`${API}/repos/${repo}`, {
        headers: {
          accept: "application/vnd.github+json",
          ...(this.token === undefined ? {} : { authorization: `Bearer ${this.token}` }),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn("github.repository.unavailable", { repo, status: response.status });
        return {};
      }
      const body = (await response.json()) as { stargazers_count?: unknown };
      return typeof body.stargazers_count === "number" ? { stars: body.stargazers_count } : {};
    } catch (error) {
      this.logger.warn("github.repository.failed", { repo, error: error instanceof Error ? error.message : String(error) });
      return {};
    }
  }
}
