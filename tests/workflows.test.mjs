import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scopeScript = fileURLToPath(new URL(
  "../plugins/5io-dev-workflow/skills/5io-code-review/scripts/check-scope.mjs", import.meta.url,
));

function run(cwd, file, args) {
  const result = spawnSync(file, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

function git(repo, ...args) {
  const result = run(repo, "git", args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function write(repo, path, content) {
  const file = join(repo, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function fixture(context) {
  const repo = mkdtempSync(join(tmpdir(), "5io-workflow-"));
  context.after(() => rmSync(repo, { recursive: true, force: true }));
  git(repo, "init", "-q");
  git(repo, "config", "user.name", "5io fixture");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(repo, "config", "core.autocrlf", "false");
  git(repo, "config", "commit.gpgsign", "false");
  return repo;
}

function review(repo, args, expectedStatus = 0) {
  const result = run(repo, process.execPath, [scopeScript, ...args]);
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("scope review reports staged, unstaged, untracked and both sides of renames", (context) => {
  const repo = fixture(context);
  write(repo, "src/report.mjs", "export const total = 1;\n");
  write(repo, "src-legacy/restricted.mjs", "export const legacy = 5;\n");
  write(repo, "src/old.mjs", "export const old = 1;\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "base");
  const base = git(repo, "rev-parse", "HEAD").trim();

  renameSync(join(repo, "src-legacy/restricted.mjs"), join(repo, "src/renamed.mjs"));
  rmSync(join(repo, "src/old.mjs"));
  git(repo, "add", "-A");
  write(repo, "src/report.mjs", "export const total = 2;\n");
  write(repo, "src-legacy/范围 外.mjs", "export const extra = 0;\n");
  write(repo, ".git/info/exclude", "scope.json\n");
  write(repo, "scope.json", JSON.stringify({
    allowed: ["src/"], restricted: ["src-legacy/restricted.mjs"], highRisk: ["src/report.mjs"],
  }));

  const before = git(repo, "status", "--porcelain=v1", "-z", "-uall");
  const staged = review(repo, ["--mode", "staged", "--scope", "scope.json"], 1);
  assert.equal(staged.base, base);
  const rename = staged.changes.find((change) => change.status === "R100");
  assert.deepEqual(rename, {
    status: "R100", oldPath: "src-legacy/restricted.mjs", path: "src/renamed.mjs",
    outside: ["src-legacy/restricted.mjs"], restricted: ["src-legacy/restricted.mjs"], highRisk: [],
  });
  assert.ok(staged.changes.some((change) => change.status === "D" && change.path === "src/old.mjs"));
  assert.ok(!staged.changes.some((change) => change.path === "src/report.mjs"));

  const unstaged = review(repo, ["--mode", "unstaged", "--scope", "scope.json"]);
  assert.equal(unstaged.comparedFrom, "index");
  assert.deepEqual(unstaged.changes.map((change) => change.highRisk), [["src/report.mjs"]]);
  const worktree = review(repo, ["--mode", "worktree", "--scope", "scope.json", "--include-untracked"], 1);
  assert.ok(worktree.changes.some((change) =>
    change.status === "?" && change.outside.includes("src-legacy/范围 外.mjs")));

  const unknown = review(repo, ["--mode", "staged"]);
  assert.equal(unknown.hasAllowedScope, false);
  assert.ok(unknown.changes.every((change) => change.outside === null));
  write(repo, "scope.json", '{"allowed":[]}');
  assert.ok(review(repo, ["--mode", "staged", "--scope", "scope.json"], 1).hasAllowedScope);
  const emptyScope = run(repo, process.execPath, [scopeScript, "--mode", "staged", "--scope="]);
  assert.equal(emptyScope.status, 2);
  assert.match(emptyScope.stderr, /non-empty JSON path/);
  write(repo, "scope.json", '{"allowed":["../escape"]}');
  assert.equal(run(repo, process.execPath, [scopeScript, "--mode", "staged", "--scope", "scope.json"]).status, 2);
  write(repo, "scope.json", '{"allow":["src/"]}');
  assert.equal(run(repo, process.execPath, [scopeScript, "--mode", "staged", "--scope", "scope.json"]).status, 2);
  assert.equal(git(repo, "status", "--porcelain=v1", "-z", "-uall"), before);
});

test("confirmed milestone supports handoff, root-cause regression and independent merge review", (context) => {
  const repo = fixture(context);
  write(repo, "src/sum.mjs", "export const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);\n");
  write(repo, "src/report.mjs", [
    'import { sum } from "./sum.mjs";',
    "export function report(rows) {",
    "  const billable = rows.filter((row) => row.amount);",
    "  return { total: sum(billable), count: billable.length };",
    "}",
    "",
  ].join("\n"));
  write(repo, "tests/report.test.mjs", [
    'import assert from "node:assert/strict";',
    'import { report } from "../src/report.mjs";',
    'assert.deepEqual(report([{ amount: 2 }]), { total: 2, count: 1 });',
    "",
  ].join("\n"));
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "Synthetic report has zero-count bug");
  const base = git(repo, "rev-parse", "HEAD").trim();

  // Confirmed handoff uses these same fields for implementation and review.
  const handoff = {
    base,
    scope: { allowed: ["src/report.mjs", "tests/report.test.mjs"], restricted: ["src/sum.mjs"] },
    acceptance: "AC-1: zero amounts count as rows, and the total is unchanged",
    quickCheck: ["tests/report.test.mjs"],
    mergeCheck: ["--test", "tests/report.test.mjs"],
  };
  assert.equal(git(repo, "rev-parse", "HEAD").trim(), handoff.base);
  write(repo, "scope.json", JSON.stringify(handoff.scope));
  const testSource = readFileSync(join(repo, "tests/report.test.mjs"), "utf8");
  write(repo, "tests/report.test.mjs", testSource +
    'assert.deepEqual(report([{ amount: 0 }, { amount: 2 }]), { total: 2, count: 2 }, "AC-1");\n');
  const before = run(repo, process.execPath, handoff.quickCheck);
  assert.equal(before.status, 1);
  assert.match(before.stderr, /AC-1/);

  const source = readFileSync(join(repo, "src/report.mjs"), "utf8");
  assert.match(source, /count: billable.length/);
  write(repo, "src/report.mjs", source.replace("count: billable.length", "count: rows.length"));
  const after = run(repo, process.execPath, handoff.quickCheck);
  assert.equal(after.status, 0, after.stderr);
  write(repo, "src/sum.mjs", readFileSync(join(repo, "src/sum.mjs"), "utf8") + "// Unrelated change\n");
  const drift = review(repo, ["--mode", "worktree", "--base", base, "--scope", "scope.json"], 1);
  const restricted = drift.changes.find((change) => change.path === "src/sum.mjs");
  assert.deepEqual(restricted.outside, ["src/sum.mjs"]);
  assert.deepEqual(restricted.restricted, ["src/sum.mjs"]);
  git(repo, "restore", "--", "src/sum.mjs");
  git(repo, "add", "--", ...handoff.scope.allowed);
  git(repo, "commit", "-qm", "Include zero amounts in report row count");
  const target = git(repo, "rev-parse", "HEAD").trim();
  const result = review(repo, ["--mode", "commits", "--base", base, "--target", target, "--merge-base", "--scope", "scope.json"]);
  assert.equal(result.comparedFrom, base);
  assert.equal(result.target, target);
  assert.deepEqual(result.changes.map((change) => change.path).sort(), handoff.scope.allowed);
  assert.equal(result.changes.filter((change) => change.outside.length || change.restricted.length).length, 0);
  const merge = run(repo, process.execPath, handoff.mergeCheck);
  assert.equal(merge.status, 0, merge.stderr || merge.stdout);

  git(repo, "switch", "--detach", base);
  write(repo, "upstream-only.txt", "Changes on the base branch after the feature forked.\n");
  git(repo, "add", "upstream-only.txt");
  git(repo, "commit", "-qm", "Advance base branch");
  const newerBase = git(repo, "rev-parse", "HEAD").trim();
  const compare = ["--mode", "commits", "--base", newerBase, "--target", target, "--scope", "scope.json"];
  assert.equal(review(repo, [...compare, "--merge-base"]).comparedFrom, base);
  const snapshot = review(repo, compare, 1);
  assert.ok(snapshot.changes.some((change) =>
    change.status === "D" && change.outside.includes("upstream-only.txt")));
});

test("directory rules include the submodule root despite Git ignore settings", (context) => {
  const repo = fixture(context);
  write(repo, "README.md", "Fixture\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-qm", "Create first submodule revision");
  const first = git(repo, "rev-parse", "HEAD").trim();
  git(repo, "update-index", "--add", "--cacheinfo", `160000,${first},vendor`);
  git(repo, "commit", "-qm", "Track submodule");
  const base = git(repo, "rev-parse", "HEAD").trim();

  git(repo, "config", "diff.ignoreSubmodules", "all");
  git(repo, "update-index", "--cacheinfo", `160000,${base},vendor`);
  write(repo, "scope.json", '{"allowed":["vendor/"],"restricted":["vendor/"],"highRisk":["vendor/"]}');
  const result = review(repo, ["--mode", "staged", "--scope", "scope.json"], 1);
  assert.deepEqual(result.changes, [{
    status: "M", path: "vendor", outside: [], restricted: ["vendor"], highRisk: ["vendor"],
  }]);
});

test("review loads the scope from the approved commit even if the candidate widens it", (context) => {
  const repo = fixture(context);
  write(repo, "plans/approved scope.json", '{"allowed":["src/"]}');
  write(repo, "vendor/service.mjs", "export const enabled = false;\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "Approved scope");
  const approved = git(repo, "rev-parse", "HEAD").trim();
  write(repo, "plans/approved scope.json", '{"allowed":["src/","vendor/","plans/"]}');
  write(repo, "vendor/service.mjs", "export const enabled = true;\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "Candidate modifies implementation and scope");
  const args = ["--mode", "commits", "--base", approved, "--target", "HEAD",
    "--scope", "plans/approved scope.json"];
  const result = review(repo, [...args, "--scope-ref", approved], 1);
  assert.deepEqual(result.scopeSource, {
    kind: "commit", commit: approved, path: "plans/approved scope.json",
  });
  assert.deepEqual(result.changes.map((change) => change.outside), [
    ["plans/approved scope.json"], ["vendor/service.mjs"],
  ]);
  const movingRef = run(repo, process.execPath, [scopeScript, ...args, "--scope-ref", "HEAD"]);
  assert.equal(movingRef.status, 2);
  assert.match(movingRef.stderr, /full commit SHA/);
});

test("working tree review reports paths hidden by index flags as incomplete", (context) => {
  const repo = fixture(context);
  write(repo, "assumed.txt", "original\n");
  write(repo, "skipped.txt", "original\n");
  write(repo, "visible.txt", "original\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "Base");
  git(repo, "update-index", "--assume-unchanged", "assumed.txt");
  git(repo, "update-index", "--skip-worktree", "skipped.txt");
  write(repo, "assumed.txt", "modified\n");
  write(repo, "skipped.txt", "modified\n");
  write(repo, "visible.txt", "modified\n");
  const staged = review(repo, ["--mode", "staged"]);
  assert.deepEqual(staged.unchecked, []);
  for (const mode of ["worktree", "unstaged"]) {
    const result = review(repo, ["--mode", mode], 2);
    assert.deepEqual(result.unchecked, ["assumed.txt", "skipped.txt"]);
    assert.deepEqual(result.changes.map((change) => change.path), ["visible.txt"]);
  }
});

test("scope review avoids configured filesystem monitors and worktree filters", (context) => {
  const repo = fixture(context);
  write(repo, ".gitattributes", "*.txt filter=scope-probe\n");
  write(repo, "filtered.txt", "original\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "Base");

  write(repo, ".git/probe-monitor", "#!/bin/sh\nprintf invoked >.git/monitor-marker\nexit 1\n");
  chmodSync(join(repo, ".git/probe-monitor"), 0o755);
  git(repo, "config", "core.fsmonitor", ".git/probe-monitor");
  git(repo, "status", "--porcelain");
  assert.ok(existsSync(join(repo, ".git/monitor-marker")));
  rmSync(join(repo, ".git/monitor-marker"));
  write(repo, "filtered.txt", "modified\n");
  const result = review(repo, ["--mode", "worktree"]);
  assert.deepEqual(result.changes.map((change) => change.path), ["filtered.txt"]);
  assert.equal(existsSync(join(repo, ".git/monitor-marker")), false);

  const filter = 'printf invoked >.git/filter-marker; cat';
  for (const kind of ["clean", "process"]) {
    git(repo, "config", `filter.scope-probe.${kind}`, filter);
    const blocked = review(repo, ["--mode", "worktree", "--include-untracked"], 2);
    assert.deepEqual(blocked.filteredPaths, ["filtered.txt"]);
    assert.deepEqual(blocked.changes, []);
    assert.equal(blocked.includesUntracked, false);
    assert.deepEqual(review(repo, ["--mode", "staged"]).filteredPaths, []);
    assert.equal(existsSync(join(repo, ".git/filter-marker")), false);
    git(repo, "config", "--unset", `filter.scope-probe.${kind}`);
  }
  assert.equal(existsSync(join(repo, ".git/monitor-marker")), false);
});
