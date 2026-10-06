import { Ajv } from "ajv";
import type { ParameterSchema, Template } from "./template.js";

/** Form input that failed validation; lists every problem, one per field. */
export class ParameterError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`invalid parameters:\n  - ${problems.join("\n  - ")}`);
    this.name = "ParameterError";
    this.problems = problems;
  }
}

/** One JSON Schema for all form pages, without the Backstage-only ui:* keys. */
export function parameterSchema(template: Template): Record<string, unknown> {
  const properties: Record<string, ParameterSchema> = {};
  const required: string[] = [];
  for (const page of template.parameters) {
    for (const [name, prop] of Object.entries(page.properties)) {
      properties[name] = Object.fromEntries(Object.entries(prop).filter(([k]) => !k.startsWith("ui:")));
    }
    required.push(...(page.required ?? []));
  }
  return { type: "object", properties, required, additionalProperties: false };
}

/**
 * Validate form values against the template's parameters (as the Backstage form would) and fill
 * in defaults; returns the completed values or throws ParameterError.
 */
export function validateParameters(template: Template, values: Record<string, unknown>): Record<string, unknown> {
  const schema = parameterSchema(template);
  const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
  const validate = ajv.compile(schema);
  const copy = structuredClone(values);
  if (validate(copy)) return copy;
  const props = schema.properties as Record<string, ParameterSchema>;
  const problems = (validate.errors ?? []).map((e) => {
    const field = e.instancePath.replace(/^\//, "") || String(e.params.missingProperty ?? e.params.additionalProperty ?? "");
    const prop = props[field];
    if (e.keyword === "pattern" && prop?.description) return `${field}: ${prop.description}`;
    if (e.keyword === "required") return `${field}: required`;
    if (e.keyword === "additionalProperties") return `${field}: not a parameter of this template`;
    if (e.keyword === "enum") return `${field}: must be one of ${(e.params.allowedValues as unknown[]).join(", ")}`;
    return `${field}: ${e.message ?? "invalid"}`;
  });
  throw new ParameterError([...new Set(problems)]);
}
