import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { parseAllDocuments } from "yaml";
import { evaluate } from "./expressions.js";
import { parseRepoUrl, templateEnvironment } from "./nunjucks-env.js";
import { validateParameters } from "./params.js";
import { renderSkeleton } from "./render.js";
import { loadTemplate } from "./template.js";

/** An action that would change the outside world (create a repo, register in the catalog). */
export interface PlannedAction {
  readonly id: string;
  readonly action: string;
  readonly input: unknown;
}

/** What one template run produced. */
export interface ScaffoldResult {
  readonly parameters: Record<string, unknown>;
  readonly files: readonly string[];
  readonly skippedSteps: readonly string[];
  readonly planned: readonly PlannedAction[];
  readonly output: unknown;
}

/**
 * Run a Backstage template locally: validate the form values, evaluate each step's `if` and
 * input, render every fetch:template skeleton into outDir, and plan (not perform) the steps that
 * reach outside: publish:github and catalog:register. Their outputs are computed the way the real
 * actions report them, so later steps and the template output can refer to them.
 */
export function scaffold(templateDir: string, values: Record<string, unknown>, outDir: string): ScaffoldResult {
  const template = loadTemplate(templateDir);
  const parameters = validateParameters(template, values);
  const env = templateEnvironment();
  const steps: Record<string, { output: Record<string, unknown> }> = {};
  const files: string[] = [];
  const skippedSteps: string[] = [];
  const planned: PlannedAction[] = [];
  mkdirSync(outDir, { recursive: true });
  const templateRoot = resolve(templateDir);

  for (const step of template.steps) {
    const context = { parameters, steps };
    if (step.if !== undefined && !evaluate(env, step.if, context)) {
      skippedSteps.push(step.id);
      continue;
    }
    const input = (evaluate(env, step.input ?? {}, context) ?? {}) as Record<string, unknown>;
    let output: Record<string, unknown> = {};
    switch (step.action) {
      case "fetch:template": {
        const source = resolve(templateRoot, String(input.url));
        if (!source.startsWith(templateRoot + sep)) throw new Error(`step ${step.id}: url must stay inside the template`);
        files.push(...renderSkeleton(env, source, outDir, (input.values ?? {}) as Record<string, unknown>));
        break;
      }
      case "publish:github": {
        const { owner, repo } = parseRepoUrl(input.repoUrl);
        planned.push({ id: step.id, action: step.action, input });
        output = {
          remoteUrl: `https://github.com/${owner}/${repo}`,
          repoContentsUrl: `https://github.com/${owner}/${repo}/blob/main`,
        };
        break;
      }
      case "catalog:register": {
        planned.push({ id: step.id, action: step.action, input });
        const path = String(input.catalogInfoPath ?? "/catalog-info.yaml").replace(/^\//, "");
        const first = parseAllDocuments(readFileSync(join(outDir, path), "utf8"))[0]?.toJS() as
          | { kind?: string; metadata?: { name?: string } }
          | undefined;
        output = { entityRef: `${String(first?.kind ?? "component").toLowerCase()}:default/${first?.metadata?.name ?? ""}` };
        break;
      }
      default:
        throw new Error(`unsupported action ${step.action}`);
    }
    steps[step.id] = { output };
  }
  return { parameters, files, skippedSteps, planned, output: evaluate(env, template.output ?? {}, { parameters, steps }) };
}
