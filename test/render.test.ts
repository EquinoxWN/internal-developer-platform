import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { templateEnvironment } from "../src/nunjucks-env.js";
import { renderSkeleton } from "../src/render.js";
import { read, tempDir } from "./helpers.js";

const env = templateEnvironment();

/** A skeleton directory with the given files. */
function skeleton(files: Record<string, string>): string {
  const dir = tempDir("skeleton-");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

test("paths and contents are both templates", () => {
  const src = skeleton({ "src/${{ values.module }}/main.txt": "hello ${{ values.name }}{% if values.flag %}!{% endif %}" });
  const out = tempDir();
  assert.deepEqual(renderSkeleton(env, src, out, { module: "pay_api", name: "pay-api", flag: true }), ["src/pay_api/main.txt"]);
  assert.equal(read(out, "src/pay_api/main.txt"), "hello pay-api!");
});

test("rendered paths cannot escape the target directory", () => {
  const src = skeleton({ "${{ values.dir }}/x.txt": "x" });
  for (const dir of ["..", "../../outside", ".", ""]) {
    assert.throws(() => renderSkeleton(env, src, tempDir(), { dir }), /unsafe path/, JSON.stringify(dir));
  }
});

test("two steps cannot write the same file", () => {
  const src = skeleton({ "README.md": "one" });
  const out = tempDir();
  renderSkeleton(env, src, out, {});
  assert.throws(() => renderSkeleton(env, src, out, {}), /already written/);
});

test("an undefined value in a skeleton fails the render", () => {
  const src = skeleton({ "a.txt": "${{ values.missing }}" });
  assert.throws(() => renderSkeleton(env, src, tempDir(), {}), /undefined/);
});
