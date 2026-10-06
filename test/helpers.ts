import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TEMPLATE = "templates/service";

/** A complete, valid set of form values; override fields per test. */
export function form(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "payments-api",
    description: "Takes card payments for the checkout flow.",
    owner: "group:payments",
    language: "node",
    database: false,
    repoUrl: "github.com?owner=acme&repo=payments-api",
    ...overrides,
  };
}

/** A fresh empty directory inside the repo's temp folder. */
export function tempDir(prefix = "idp-test-"): string {
  const base = process.env.TMP ?? process.env.TMPDIR ?? ".tmp";
  mkdirSync(base, { recursive: true }); // a fresh clone has no .tmp yet
  return mkdtempSync(join(base, prefix));
}

/** Read a generated file. */
export const read = (dir: string, path: string): string => readFileSync(join(dir, path), "utf8");
