import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "../src/cli.js";
import { tempDir } from "./helpers.js";

/** Run the CLI, capturing output lines. */
async function cli(args: string[]): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, (l) => out.push(l), (l) => err.push(l));
  return { code, out, err };
}

test("scaffold prints the files, the planned actions and the links", async () => {
  const dir = tempDir();
  const r = await cli(["scaffold", "--template", "templates/service", "--out", dir, "--set", "name=search-api",
    "--set", "description=Full-text search over the product catalog.", "--set", "owner=group:search",
    "--set", "language=go", "--set", "database=true", "--set", "repoUrl=github.com?owner=acme&repo=search-api"]);
  assert.equal(r.code, 0, r.err.join("\n"));
  assert.match(r.out[0] ?? "", /^created 13 files/);
  assert.ok(r.out.some((l) => l.startsWith("planned publish:github")));
  const v = await cli(["validate-catalog", `${dir}/catalog-info.yaml`]);
  assert.deepEqual(v.out, ["ok: Component:search-api, Resource:search-api-db"]);
});

test("invalid values exit with 1 and list every problem; bad usage exits with 2", async () => {
  const r = await cli(["scaffold", "--template", "templates/service", "--out", tempDir(), "--set", "name=Bad Name", "--set", "language=go"]);
  assert.equal(r.code, 1);
  assert.match(r.err.join("\n"), /name: Lowercase letters/);
  assert.match(r.err.join("\n"), /description: required/);
  assert.equal((await cli(["deploy"])).code, 2);
  assert.equal((await cli(["scaffold", "--template"])).code, 2);
});
