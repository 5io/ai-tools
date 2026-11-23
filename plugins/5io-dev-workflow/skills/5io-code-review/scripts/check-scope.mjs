import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

function git(directory, args) {
  try {
    return execFileSync("git", ["--no-optional-locks", "-C", directory, ...args], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message);
  }
}

function readPaths(config, key) {
  const paths = config[key];
  if (paths === undefined) return undefined;
  if (!Array.isArray(paths) || paths.some((path) =>
    typeof path !== "string" || !path || /[\\:\x00-\x1f]/.test(path) ||
    path.replace(/\/$/, "").split("/").some((part) => !part || part === "." || part === "..")
  )) {
    throw new Error(`${key} must contain repo-relative paths, with a trailing slash for directories`);
  }
  return paths;
}

function matches(path, rules = []) {
  return rules.some((rule) => rule.endsWith("/") ? path.startsWith(rule) : path === rule);
}

function readChanges(output) {
  if (!output) return [];
  const fields = output.slice(0, -1).split("\0");
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    const firstPath = fields[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      changes.push({ status, oldPath: firstPath, path: fields[index++] });
    } else {
      changes.push({ status, path: firstPath });
    }
  }
  return changes;
}

function main() {
  const { values } = parseArgs({
    options: {
      repo: { type: "string", default: "." },
      scope: { type: "string" },
      mode: { type: "string" },
      base: { type: "string" },
      target: { type: "string" },
      "merge-base": { type: "boolean" },
      "include-untracked": { type: "boolean" },
    },
  });
  const { repo, scope, mode, base, target } = values;
  if (!["commits", "staged", "unstaged", "worktree"].includes(mode)) {
    throw new Error("--mode must be commits, staged, unstaged, or worktree");
  }
  if (mode === "commits" ? !base || !target : target || values["merge-base"]) {
    throw new Error("commits mode requires --base and --target; --target and --merge-base only apply to that mode");
  }
  if (mode === "unstaged" && base) throw new Error("unstaged mode compares the index to the worktree; omit --base");
  if (values["include-untracked"] && !["unstaged", "worktree"].includes(mode)) {
    throw new Error("--include-untracked requires unstaged or worktree mode");
  }

  const config = scope ? JSON.parse(readFileSync(scope, "utf8")) : {};
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Scope JSON must be an object");
  }
  for (const key of Object.keys(config)) {
    if (!["allowed", "restricted", "highRisk"].includes(key)) {
      throw new Error(`Unknown scope field: ${key}`);
    }
  }
  const allowed = readPaths(config, "allowed");
  const restricted = readPaths(config, "restricted");
  const highRisk = readPaths(config, "highRisk");
  const root = git(repo, ["rev-parse", "--show-toplevel"]).replace(/\r?\n$/, "");
  const resolveCommit = (ref) => git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
  const baseCommit = mode === "unstaged" ? null : resolveCommit(base ?? "HEAD");
  const targetCommit = mode === "commits" ? resolveCommit(target) : null;
  const diffBase = values["merge-base"] ? git(root, ["merge-base", baseCommit, targetCommit]).trim() : baseCommit;

  const args = [
    "diff", "--no-ext-diff", "--no-textconv", "--no-relative", "--ignore-submodules=none",
    "--name-status", "-z", "-M",
  ];
  if (mode === "staged") args.push("--cached");
  if (diffBase) args.push(diffBase);
  if (targetCommit) args.push(targetCommit);
  const changes = readChanges(git(root, [...args, "--"]));
  if (values["include-untracked"]) {
    for (const path of git(root, ["ls-files", "-z", "--others", "--exclude-standard"]).split("\0").filter(Boolean)) {
      changes.push({ status: "?", path });
    }
  }

  for (const change of changes) {
    const paths = [change.path, change.oldPath].filter(Boolean);
    change.outside = allowed === undefined ? null : paths.filter((path) => !matches(path, allowed));
    change.restricted = paths.filter((path) => matches(path, restricted));
    change.highRisk = paths.filter((path) => matches(path, highRisk));
  }
  console.log(JSON.stringify({
    mode,
    base: baseCommit,
    comparedFrom: diffBase ?? "index",
    target: targetCommit ?? (mode === "staged" ? "index" : "worktree"),
    includesUntracked: Boolean(values["include-untracked"]),
    hasAllowedScope: allowed !== undefined,
    changes,
  }, null, 2));

  if (changes.some((change) => change.outside?.length || change.restricted.length)) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
