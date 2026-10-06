import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type nunjucks from "nunjucks";

/** Every file under dir, as forward-slash paths relative to dir, sorted. */
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dir, full).split(sep).join("/"));
    }
  };
  walk(dir);
  return out;
}

/**
 * Render a skeleton directory into targetDir: file paths and contents are both templates with
 * `values` in scope. A rendered path that is empty, absolute or escapes targetDir is refused, and
 * so is a file that an earlier step already wrote. Returns the written paths.
 */
export function renderSkeleton(
  env: nunjucks.Environment,
  skeletonDir: string,
  targetDir: string,
  values: Record<string, unknown>,
): string[] {
  const written: string[] = [];
  const root = resolve(targetDir);
  for (const rel of listFiles(skeletonDir)) {
    const renderedPath = env.renderString(rel, { values });
    const segments = renderedPath.split("/");
    if (isAbsolute(renderedPath) || segments.some((s) => s === "" || s === "." || s === "..")) {
      throw new Error(`skeleton path ${rel} rendered to an unsafe path ${JSON.stringify(renderedPath)}`);
    }
    const target = resolve(root, ...segments);
    if (target !== root && !target.startsWith(root + sep)) throw new Error(`skeleton path ${rel} escapes the target`);
    if (existsSync(target)) throw new Error(`${renderedPath} was already written by an earlier step`);
    const content = env.renderString(readFileSync(join(skeletonDir, rel), "utf8"), { values });
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    written.push(renderedPath);
  }
  return written;
}
