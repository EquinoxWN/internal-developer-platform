import type nunjucks from "nunjucks";

const WHOLE = /^\$\{\{([\s\S]*)\}\}$/;

/**
 * Evaluate `${{ ... }}` expressions in a step's input, like Backstage: a string that is exactly
 * one expression keeps the expression's type (so `${{ parameters.database }}` is a boolean),
 * any other string is rendered as text, and objects and lists are evaluated recursively.
 */
export function evaluate(env: nunjucks.Environment, value: unknown, context: object): unknown {
  if (typeof value === "string") {
    const whole = WHOLE.exec(value);
    if (whole && !whole[1]?.includes("}}")) {
      const json = env.renderString(`\${{ (${whole[1]}) | dump }}`, context);
      return json === "" ? undefined : JSON.parse(json);
    }
    return value.includes("${{") || value.includes("{%") ? env.renderString(value, context) : value;
  }
  if (Array.isArray(value)) return value.map((v) => evaluate(env, v, context));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, evaluate(env, v, context)]));
  }
  return value;
}
