// Time from filled-in form to a generated service whose own tests pass, per language.
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { available, runGeneratedTests } from "./generated.js";
import { scaffold } from "./scaffold.js";

const languages = [
  ["node", process.execPath],
  ["python", process.platform === "win32" ? "python" : "python3"],
  ["go", "go"],
] as const;
console.log("| Language | Database | Files | Render | Generated tests | Total |");
console.log("|---|---|---|---|---|---|");
for (const [language, tool] of languages) {
  if (!available(tool)) {
    console.log(`| ${language} | - | - | - | ${tool} not installed | - |`);
    continue;
  }
  for (const database of [false, true]) {
    const out = mkdtempSync(join(process.env.TMP ?? process.env.TMPDIR ?? ".", "idp-measure-"));
    const start = performance.now();
    const result = scaffold("templates/service", {
      name: "payments-api",
      description: "Takes card payments for the checkout flow.",
      owner: "group:payments",
      language,
      database,
      repoUrl: "github.com?owner=acme&repo=payments-api",
    }, out);
    const render = performance.now() - start;
    const tests = runGeneratedTests(language, out);
    console.log(
      `| ${language} | ${database ? "yes" : "no"} | ${result.files.length} | ${render.toFixed(0)} ms | ${tests.status === 0 ? "pass" : "FAIL"} in ${tests.ms.toFixed(0)} ms | ${(performance.now() - start).toFixed(0)} ms |`,
    );
    rmSync(out, { recursive: true, force: true });
  }
}
