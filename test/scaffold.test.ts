import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { parse } from "yaml";
import { validateCatalog } from "../src/catalog.js";
import { available, runGeneratedTests } from "../src/generated.js";
import { ParameterError } from "../src/params.js";
import { scaffold } from "../src/scaffold.js";
import { form, read, TEMPLATE, tempDir } from "./helpers.js";

const TOOLS: Record<string, string> = { node: process.execPath, python: process.platform === "win32" ? "python" : "python3", go: "go" };
const PINNED_ACTION = /^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d/;
const PINNED_IMAGE = /^FROM \S+:\S+@sha256:[0-9a-f]{64}/;

/** Every file in a directory tree. */
function walk(dir: string, prefix = ""): string[] {
  return readdirSync(join(dir, prefix)).flatMap((name) => {
    const rel = prefix ? `${prefix}/${name}` : name;
    return statSync(join(dir, rel)).isDirectory() ? walk(dir, rel) : [rel];
  });
}

for (const language of ["node", "python", "go"]) {
  for (const database of [false, true]) {
    describe(`${language} service${database ? " with a database" : ""}`, () => {
      const out = tempDir(`idp-${language}-`);
      const result = scaffold(TEMPLATE, form({ language, database }), out);

      test("the expected files are generated, with no template syntax left over", () => {
        for (const f of ["catalog-info.yaml", "Dockerfile", ".github/workflows/ci.yml", "README.md", "mkdocs.yml", "docs/index.md"]) {
          assert.ok(result.files.includes(f), f);
        }
        assert.equal(result.files.includes("db/migrations/0001_init.sql"), database);
        assert.deepEqual(result.skippedSteps, database ? [] : ["fetch-database"]);
        for (const f of walk(out)) assert.doesNotMatch(read(out, f), /\$\{\{|\{%|%\}/, f);
      });

      test("catalog-info.yaml passes Backstage's own catalog validation", async () => {
        const { entities, problems } = await validateCatalog(read(out, "catalog-info.yaml"));
        assert.deepEqual(problems, []);
        const component = entities[0];
        assert.equal(component?.metadata.name, "payments-api");
        assert.equal(component?.spec?.owner, "group:payments");
        assert.equal(component?.metadata.annotations?.["github.com/project-slug"], "acme/payments-api");
        assert.deepEqual(component?.spec?.dependsOn, database ? ["resource:payments-api-db"] : undefined);
        assert.equal(entities.length, database ? 2 : 1);
      });

      test("CI pins every action to a commit SHA and builds the image", () => {
        const workflow = parse(read(out, ".github/workflows/ci.yml")) as { permissions: unknown; jobs: { build: { steps: { uses?: string; run?: string }[] } } };
        assert.deepEqual(workflow.permissions, { contents: "read" });
        const raw = read(out, ".github/workflows/ci.yml");
        for (const line of raw.split("\n").filter((l) => l.includes("uses:"))) {
          assert.match(line.trim().replace(/^- uses: /, ""), PINNED_ACTION, line);
        }
        assert.ok(workflow.jobs.build.steps.some((s) => s.run === "docker build -t payments-api:ci ."));
      });

      test("the Dockerfile pins base images by digest and runs as a non-root user", () => {
        const lines = read(out, "Dockerfile").split("\n");
        const from = lines.filter((l) => l.startsWith("FROM "));
        assert.ok(from.length >= 1);
        for (const l of from) assert.match(l, PINNED_IMAGE, l);
        const user = lines.filter((l) => l.startsWith("USER ")).at(-1) ?? "";
        assert.match(user, /^USER (node|app|nonroot:nonroot)$/, "the last USER line picks an unprivileged account");
      });

      test("the generated service's own tests pass", { skip: available(TOOLS[language] as string) ? false : `${language} toolchain not installed` }, () => {
        const r = runGeneratedTests(language, out);
        assert.equal(r.status, 0, r.output);
      });

      test("publishing and catalog registration are planned with the right inputs", () => {
        assert.deepEqual(result.planned.map((a) => a.action), ["publish:github", "catalog:register"]);
        assert.deepEqual(result.output, {
          links: [
            { title: "Repository", url: "https://github.com/acme/payments-api" },
            { title: "Open in catalog", icon: "catalog", entityRef: "component:default/payments-api" },
          ],
        });
      });
    });
  }
}

test("invalid form values stop the run before any file is written", () => {
  const out = tempDir();
  assert.throws(() => scaffold(TEMPLATE, form({ name: "Not Valid" }), out), ParameterError);
  assert.deepEqual(readdirSync(out), []);
});
