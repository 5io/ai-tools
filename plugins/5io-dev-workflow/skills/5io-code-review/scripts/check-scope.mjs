import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

function git(directory, args, input) {
  try {
    return execFileSync("git", [
      "--no-optional-locks", "--no-replace-objects", "-c", "core.fsmonitor=false", "-C", directory, ...args,
    ], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      input,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message);
  }
}

function isRepoPath(path) {
  return typeof path === "string" && !/[\\:\x00-\x1f]/.test(path) &&
    path.split("/").every((part) => part && part !== "." && part !== "..");
}

function readPaths(config, key) {
  const paths = config[key];
  if (paths === undefined) return undefined;
  if (!Array.isArray(paths) || paths.some((path) =>
    typeof path !== "string" || !isRepoPath(path.replace(/\/$/, ""))
  )) {
    throw new Error(`${key} must contain repo-relative paths, with a trailing slash for directories`);
  }
  return paths;
}

function matches(path, rules = []) {
  return rules.some((rule) => rule.endsWith("/")
    ? path === rule.slice(0, -1) || path.startsWith(rule)
    : path === rule);
}

function readScope(root, file, ref) {
  if (file === undefined && ref === undefined) return { config: {}, scopeSource: null };
  if (!file?.trim()) throw new Error("--scope requires a non-empty JSON path");

  if (ref === undefined) {
    const path = resolve(file);
    return { config: JSON.parse(readFileSync(path, "utf8")), scopeSource: { kind: "file", path } };
  }

  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(ref) || !isRepoPath(file)) {
    throw new Error("--scope-ref requires a full commit SHA and a repo-relative --scope path");
  }
  const commit = ref.toLowerCase();
  if (git(root, ["cat-file", "-t", commit]).trim() !== "commit") {
    throw new Error("--scope-ref must identify a commit");
  }
  const config = JSON.parse(git(root, ["cat-file", "blob", `${commit}:${file}`]));
  return { config, scopeSource: { kind: "commit", commit, path: file } };
}

function worktreeLimits(root) {
  const tracked = git(root, ["ls-files", "-v", "-z"]).split("\0").filter(Boolean);
  const unchecked = tracked.filter((line) => /^[a-zS] /.test(line)).map((line) => line.slice(2));
  const filterCommands = new Map();
  for (const entry of git(root, ["config", "--null", "--list"]).split("\0")) {
    const match = /^(filter\.(.+)\.(?:clean|process))\n([\s\S]*)$/.exec(entry);
    if (match) filterCommands.set(match[1], { name: match[2], command: match[3] });
  }
  const filters = new Set([...filterCommands.values()]
    .filter(({ command }) => command).map(({ name }) => name));
  if (!filters.size || !tracked.length) return { unchecked, filteredPaths: [] };

  const paths = new Set(tracked.map((line) => line.slice(2)));
  const fields = git(root, ["check-attr", "-z", "--stdin", "filter"], [...paths].join("\0") + "\0").split("\0");
  const filteredPaths = [];
  for (let index = 0; index + 2 < fields.length; index += 3) {
    if (filters.has(fields[index + 2])) filteredPaths.push(fields[index]);
  }
  return { unchecked, filteredPaths };
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
      "scope-ref": { type: "string" },
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

  const root = git(repo, ["rev-parse", "--show-toplevel"]).replace(/\r?\n$/, "");
  const { config, scopeSource } = readScope(root, scope, values["scope-ref"]);
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
  const resolveCommit = (ref) => git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
  const baseCommit = mode === "unstaged" ? null : resolveCommit(base ?? "HEAD");
  const targetCommit = mode === "commits" ? resolveCommit(target) : null;
  const diffBase = values["merge-base"] ? git(root, ["merge-base", baseCommit, targetCommit]).trim() : baseCommit;

  const usesWorktree = mode === "unstaged" || mode === "worktree";
  const { unchecked, filteredPaths } = usesWorktree
    ? worktreeLimits(root) : { unchecked: [], filteredPaths: [] };
  const args = ["diff", "--no-ext-diff", "--no-textconv", "--no-relative",
    usesWorktree ? "--ignore-submodules=dirty" : "--ignore-submodules=none", "--name-status", "-z", "-M"];
  if (mode === "staged") args.push("--cached");
  if (diffBase) args.push(diffBase);
  if (targetCommit) args.push(targetCommit);
  const changes = filteredPaths.length ? [] : readChanges(git(root, [...args, "--"]));
  const includesUntracked = Boolean(values["include-untracked"]) && !filteredPaths.length;
  if (includesUntracked) {
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
    includesUntracked,
    hasAllowedScope: allowed !== undefined,
    scopeSource,
    unchecked,
    filteredPaths,
    changes,
  }, null, 2));

  if (unchecked.length || filteredPaths.length) {
    console.error("Worktree scan incomplete: see unchecked index paths or configured filter paths. Use staged or commits for a snapshot.");
    process.exitCode = 2;
  } else if (changes.some((change) => change.outside?.length || change.restricted.length)) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
