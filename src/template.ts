import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** A JSON Schema property as used in template parameters (ui:* keys are for the Backstage form). */
export type ParameterSchema = Record<string, unknown> & { type?: string; description?: string; title?: string };

/** One page of the template form. */
export interface ParameterPage {
  readonly title?: string;
  readonly required?: readonly string[];
  readonly properties: Readonly<Record<string, ParameterSchema>>;
}

/** One scaffolder step. */
export interface Step {
  readonly id: string;
  readonly name?: string;
  readonly action: string;
  readonly if?: unknown;
  readonly input?: unknown;
}

/** The parts of a Backstage `Template` entity the scaffolder uses. */
export interface Template {
  readonly dir: string;
  readonly name: string;
  readonly parameters: readonly ParameterPage[];
  readonly steps: readonly Step[];
  readonly output: unknown;
}

/** The actions this local scaffolder can run or plan. */
export const SUPPORTED_ACTIONS = new Set(["fetch:template", "publish:github", "catalog:register"]);

/** Load and structurally check templates/<name>/template.yaml; throws with the first problem. */
export function loadTemplate(dir: string): Template {
  const doc = parse(readFileSync(join(dir, "template.yaml"), "utf8")) as Record<string, any> | null;
  const fail = (why: string): never => {
    throw new Error(`invalid template in ${dir}: ${why}`);
  };
  if (!doc || doc.apiVersion !== "scaffolder.backstage.io/v1beta3") fail("apiVersion must be scaffolder.backstage.io/v1beta3");
  if (doc?.kind !== "Template") fail("kind must be Template");
  const spec = doc?.spec as Record<string, any> | undefined;
  if (!spec || !Array.isArray(spec.parameters) || !Array.isArray(spec.steps)) fail("spec.parameters and spec.steps must be lists");
  const ids = new Set<string>();
  for (const step of spec?.steps ?? []) {
    if (typeof step?.id !== "string" || typeof step?.action !== "string") fail("every step needs an id and an action");
    if (ids.has(step.id)) fail(`duplicate step id ${step.id}`);
    if (!SUPPORTED_ACTIONS.has(step.action)) fail(`unsupported action ${step.action} in step ${step.id}`);
    ids.add(step.id);
  }
  for (const page of spec?.parameters ?? []) {
    if (typeof page?.properties !== "object" || page.properties === null) fail("every parameter page needs properties");
  }
  return {
    dir,
    name: String(doc?.metadata?.name ?? ""),
    parameters: spec?.parameters as ParameterPage[],
    steps: spec?.steps as Step[],
    output: spec?.output,
  };
}
