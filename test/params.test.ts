import assert from "node:assert/strict";
import { test } from "node:test";
import { ParameterError, validateParameters } from "../src/params.js";
import { loadTemplate } from "../src/template.js";
import { form, TEMPLATE } from "./helpers.js";

const template = loadTemplate(TEMPLATE);

/** Problems reported for some form values. */
function problems(values: Record<string, unknown>): readonly string[] {
  try {
    validateParameters(template, values);
  } catch (e) {
    if (e instanceof ParameterError) return e.problems;
    throw e;
  }
  return [];
}

test("valid values pass and defaults are filled in", () => {
  const { language, database, ...rest } = form();
  void language;
  void database;
  const values = validateParameters(template, rest);
  assert.equal(values.language, "node");
  assert.equal(values.database, false);
});

test("service names must be lowercase words joined by single dashes", () => {
  for (const name of ["Payments", "1api", "pay--api", "api-", "-api", "pay_api", "../etc", "${{ x }}", "a b"]) {
    assert.deepEqual(problems(form({ name })), ["name: Lowercase letters, digits and single dashes, for example payments-api."], name);
  }
  for (const name of ["a", "api2", "payments-api", "a1-b2-c3"]) assert.deepEqual(problems(form({ name })), [], name);
  assert.deepEqual(problems(form({ name: "a".repeat(41) })), ["name: must NOT have more than 40 characters"]);
});

test("descriptions cannot smuggle template syntax, quotes or line breaks into generated files", () => {
  for (const description of ["Line one\nline two", 'Say "hi" to all', "Uses ${{ secrets }} here", "Has {% raw %} in it", "Has `ticks` inside", "Too short"]) {
    assert.equal(problems(form({ description })).length, 1, description);
  }
});

test("every problem is reported at once, one per field", () => {
  const found = problems({ name: "Bad Name", language: "cobol", owner: "payments", extra: 1 });
  assert.deepEqual(found.toSorted(), [
    "description: required",
    "extra: not a parameter of this template",
    "language: must be one of node, python, go",
    "name: Lowercase letters, digits and single dashes, for example payments-api.",
    "owner: The team that runs the service.",
    "repoUrl: required",
  ]);
});

test("repository locations are limited to github.com with a valid owner and repo", () => {
  for (const repoUrl of ["gitlab.com?owner=acme&repo=x", "github.com?owner=acme", "https://github.com/acme/x", "github.com?owner=a&repo=x&evil=1"]) {
    assert.equal(problems(form({ repoUrl })).length, 1, repoUrl);
  }
});
