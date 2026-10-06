import nunjucks from "nunjucks";

/** Backstage's built-in `parseRepoUrl` filter: "github.com?owner=acme&repo=api" to its parts. */
export function parseRepoUrl(repoUrl: unknown): { host: string; owner: string; repo: string } {
  if (typeof repoUrl !== "string") throw new Error("repoUrl must be a string");
  const q = repoUrl.indexOf("?");
  if (q <= 0) throw new Error(`invalid repoUrl ${JSON.stringify(repoUrl)}: expected host?owner=...&repo=...`);
  const params = new URLSearchParams(repoUrl.slice(q + 1));
  const owner = params.get("owner");
  const repo = params.get("repo");
  if (!owner || !repo) throw new Error(`invalid repoUrl ${JSON.stringify(repoUrl)}: owner and repo are required`);
  return { host: repoUrl.slice(0, q), owner, repo };
}

/**
 * A Nunjucks environment configured the way Backstage's scaffolder renders templates:
 * `${{ ... }}` for expressions, no HTML escaping, and Backstage's repo-URL filters. Unlike the
 * default, an undefined variable is an error, so a typo in a template fails loudly.
 */
export function templateEnvironment(): nunjucks.Environment {
  const env = new nunjucks.Environment(null, {
    autoescape: false,
    throwOnUndefined: true,
    tags: { variableStart: "${{", variableEnd: "}}" },
  });
  env.addFilter("parseRepoUrl", parseRepoUrl);
  env.addFilter("projectSlug", (url: unknown) => {
    const { owner, repo } = parseRepoUrl(url);
    return `${owner}/${repo}`;
  });
  return env;
}
