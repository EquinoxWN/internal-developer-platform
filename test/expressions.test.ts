import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate } from "../src/expressions.js";
import { parseRepoUrl, templateEnvironment } from "../src/nunjucks-env.js";

const env = templateEnvironment();
const context = { parameters: { name: "api", database: false, n: 3, repoUrl: "github.com?owner=acme&repo=api" } };

test("a string that is one expression keeps the expression's type", () => {
  assert.equal(evaluate(env, "${{ parameters.database }}", context), false);
  assert.equal(evaluate(env, "${{ parameters.n }}", context), 3);
  assert.deepEqual(evaluate(env, "${{ parameters.repoUrl | parseRepoUrl }}", context), { host: "github.com", owner: "acme", repo: "api" });
});

test("mixed strings render as text and nested inputs are evaluated recursively", () => {
  assert.deepEqual(evaluate(env, { url: "./skeleton/${{ parameters.name }}", list: ["${{ parameters.n }}", 7] }, context), {
    url: "./skeleton/api",
    list: [3, 7],
  });
  assert.equal(evaluate(env, "${{ parameters.repoUrl | projectSlug }}", context), "acme/api");
  assert.equal(evaluate(env, "plain text", context), "plain text");
});

test("a typo in a template is an error, not an empty string", () => {
  assert.throws(() => evaluate(env, "${{ parameters.nmae }}", context), /undefined/);
});

test("repo URLs must name an owner and a repository", () => {
  assert.throws(() => parseRepoUrl("github.com"), /expected host/);
  assert.throws(() => parseRepoUrl("github.com?owner=acme"), /owner and repo/);
});
