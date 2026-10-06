import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { parameterSchema } from "../src/params.js";
import { loadTemplate, SUPPORTED_ACTIONS } from "../src/template.js";
import { TEMPLATE } from "./helpers.js";

test("the service template is a valid Backstage v1beta3 template", () => {
  const t = loadTemplate(TEMPLATE);
  assert.equal(t.name, "service");
  assert.deepEqual(t.steps.map((s) => s.id), ["fetch-code", "fetch-common", "fetch-database", "publish", "register"]);
  for (const s of t.steps) assert.ok(SUPPORTED_ACTIONS.has(s.action), s.action);
});

test("there is a skeleton for every language the form offers", () => {
  const schema = parameterSchema(loadTemplate(TEMPLATE)) as { properties: Record<string, { enum?: string[] }> };
  const languages = schema.properties.language?.enum ?? [];
  assert.deepEqual(languages, ["node", "python", "go"]);
  for (const lang of [...languages, "common", "database"]) assert.ok(existsSync(join(TEMPLATE, "skeleton", lang)), lang);
});

test("malformed templates are refused with the reason", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(process.env.TMP ?? ".tmp", "bad-template-"));
  const write = (yaml: string): void => writeFileSync(join(dir, "template.yaml"), yaml);
  write("apiVersion: v1\nkind: Template\nspec: {parameters: [], steps: []}\n");
  assert.throws(() => loadTemplate(dir), /apiVersion/);
  write("apiVersion: scaffolder.backstage.io/v1beta3\nkind: Template\nspec:\n  parameters: []\n  steps:\n    - {id: a, action: shell:run}\n");
  assert.throws(() => loadTemplate(dir), /unsupported action shell:run/);
  write("apiVersion: scaffolder.backstage.io/v1beta3\nkind: Template\nspec:\n  parameters: []\n  steps:\n    - {id: a, action: publish:github}\n    - {id: a, action: publish:github}\n");
  assert.throws(() => loadTemplate(dir), /duplicate step id/);
});
