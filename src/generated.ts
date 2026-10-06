import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

/** How to run the tests of a generated service, per language. */
export const TEST_COMMANDS: Record<string, { cmd: string; args: string[]; env?: Record<string, string> }> = {
  node: { cmd: process.execPath, args: ["--test", "test/"] },
  python: { cmd: process.platform === "win32" ? "python" : "python3", args: ["-m", "unittest", "discover", "-s", "tests"], env: { PYTHONPATH: "src" } },
  go: { cmd: "go", args: ["test", "./..."] },
};

/** Whether a command can be started on this machine. */
export function available(cmd: string): boolean {
  return spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0 || spawnSync(cmd, ["version"], { stdio: "ignore" }).status === 0;
}

/** Run the generated service's own tests in dir; returns exit status and combined output. */
export function runGeneratedTests(language: string, dir: string): { status: number | null; output: string; ms: number } {
  const t = TEST_COMMANDS[language];
  if (!t) throw new Error(`no test command for ${language}`);
  const args = language === "node" ? ["--test", ...readdirSync(join(dir, "test")).map((f) => join("test", f))] : t.args;
  const start = performance.now();
  const r = spawnSync(t.cmd, args, { cwd: dir, env: { ...process.env, ...t.env }, encoding: "utf8", timeout: 120_000 });
  return { status: r.status, output: `${r.stdout ?? ""}${r.stderr ?? ""}`, ms: performance.now() - start };
}
