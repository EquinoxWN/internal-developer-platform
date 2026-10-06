#!/usr/bin/env node
// idp scaffold --template <dir> --out <dir> --set key=value ...  |  idp validate-catalog <file>
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { validateCatalog } from "./catalog.js";
import { ParameterError } from "./params.js";
import { scaffold } from "./scaffold.js";

const USAGE = `usage: idp scaffold --template <dir> --out <dir> --set name=value [--set ...]
       idp validate-catalog <catalog-info.yaml>`;

/** Turn "true", "false" and integers into their types; everything else stays text. */
function coerce(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  return /^-?\d+$/.test(value) ? Number(value) : value;
}

/** Run one command; returns the process exit code. */
export async function run(args: string[], out = console.log, err = console.error): Promise<number> {
  const [command, ...rest] = args;
  if (command === "validate-catalog" && rest.length === 1) {
    const { entities, problems } = await validateCatalog(readFileSync(rest[0] as string, "utf8"));
    for (const p of problems) err(p);
    if (problems.length === 0) out(`ok: ${entities.map((e) => `${e.kind}:${e.metadata.name}`).join(", ")}`);
    return problems.length === 0 ? 0 : 1;
  }
  if (command !== "scaffold") {
    err(USAGE);
    return 2;
  }
  let template = "";
  let outDir = "";
  const values: Record<string, unknown> = {};
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const value = rest[++i];
    if (value === undefined) {
      err(USAGE);
      return 2;
    }
    if (flag === "--template") template = value;
    else if (flag === "--out") outDir = value;
    else if (flag === "--set" && value.includes("=")) values[value.slice(0, value.indexOf("="))] = coerce(value.slice(value.indexOf("=") + 1));
    else {
      err(USAGE);
      return 2;
    }
  }
  if (!template || !outDir) {
    err(USAGE);
    return 2;
  }
  try {
    const result = scaffold(template, values, outDir);
    out(`created ${result.files.length} files in ${outDir}`);
    for (const f of result.files) out(`  ${f}`);
    if (result.skippedSteps.length > 0) out(`skipped steps: ${result.skippedSteps.join(", ")}`);
    for (const a of result.planned) out(`planned ${a.action} (${a.id}): ${JSON.stringify(a.input)}`);
    out(`output: ${JSON.stringify(result.output)}`);
    return 0;
  } catch (e) {
    err(e instanceof ParameterError ? e.message : `error: ${(e as Error).message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
