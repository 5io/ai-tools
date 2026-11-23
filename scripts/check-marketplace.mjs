import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const pluginDirectory = resolve(root, "plugins");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const marketplace = readJson(resolve(root, ".agents/plugins/marketplace.json"));
assert.match(marketplace.name, /^5io-[a-z0-9-]+$/);
assert.ok(Array.isArray(marketplace.plugins) && marketplace.plugins.length > 0);

const pluginNames = new Set();
const skillNames = new Set();
for (const { name, source } of marketplace.plugins) {
  assert.match(name, /^5io-[a-z0-9-]+$/);
  assert.ok(!pluginNames.has(name), `Duplicate plugin: ${name}`);
  pluginNames.add(name);
  assert.equal(source.source, "local");
  const plugin = resolve(root, source.path);
  assert.equal(plugin, pluginDirectory + sep + name);

  const manifest = readJson(resolve(plugin, "plugin.json"));
  assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(manifest.name, name);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.description?.trim(), `Missing description: ${name}`);

  const skills = readdirSync(resolve(plugin, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  assert.ok(skills.length, `No skills in ${name}`);
  for (const { name: skill } of skills) {
    assert.match(skill, /^5io-[a-z0-9-]+$/);
    assert.ok(!skillNames.has(skill), `Duplicate skill: ${skill}`);
    skillNames.add(skill);
    const content = readFileSync(resolve(plugin, "skills", skill, "SKILL.md"), "utf8");
    const header = content.match(/^---\r?\nname: ([a-z0-9-]+)\r?\ndescription: ("[^"\r\n]+")\r?\n---\r?\n/);
    assert.ok(header, `Invalid SKILL.md frontmatter: ${skill}`);
    assert.equal(header[1], skill);
    assert.ok(JSON.parse(header[2]).trim());
    assert.ok(content.slice(header[0].length).trim(), `Empty SKILL.md: ${skill}`);
  }
}

for (const entry of readdirSync(pluginDirectory, { withFileTypes: true })) {
  if (entry.isDirectory()) assert.ok(pluginNames.has(entry.name), `Unlisted plugin: ${entry.name}`);
}
console.log(`Marketplace ${marketplace.name}: ${pluginNames.size} plugin(s), ${skillNames.size} skill(s).`);
