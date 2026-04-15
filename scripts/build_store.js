#!/usr/bin/env node
const { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } = require("fs");
const { join } = require("path");

const APPS_DIR = join(__dirname, "..", "nexploy");
const DIST_DIR = join(APPS_DIR, "dist");
const IGNORE = ["build.js", "auto-update.js", "update.js.template", "dist", "npindex", ".git", ".DS_Store", "NPIndex"];

const parseManifest = content => Object.fromEntries(
    content.split("\n").map(l => l.match(/^(\w+):\s*["']?([^"'\n]+)["']?/)).filter(Boolean).map(m => [m[1], m[2].trim()])
);

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const buildApp = (appDir, appId, letter) => {
    const manifest = parseManifest(readFileSync(join(appDir, "manifest.yml"), "utf8"));
    const version = manifest.version || "0.0.0";
    const destDir = join(DIST_DIR, letter, appId);
    mkdirSync(destDir, { recursive: true });
    cpSync(appDir, destDir, { recursive: true });
    console.log(`  → ${letter}/${appId}@${version}`);
    return { id: appId, letter, version, name: manifest.name || appId, description: manifest.description || "", category: manifest.category || "Other", type: manifest.type || "unknown", hasLogo: existsSync(join(appDir, "logo.png")) };
};

console.log("Building apps...\n");
if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR);
if (!existsSync(join(DIST_DIR, "categories"))) mkdirSync(join(DIST_DIR, "categories"));

const index = [], cats = {};
for (const letter of readdirSync(APPS_DIR)) {
    const lPath = join(APPS_DIR, letter);
    if (IGNORE.includes(letter) || !statSync(lPath).isDirectory() || letter.length !== 1) continue;
    for (const id of readdirSync(lPath)) {
        const aPath = join(lPath, id);
        if (!statSync(aPath).isDirectory()) continue;
        const r = buildApp(aPath, id, letter);
        index.push(`${r.id}@${r.version}`);
        (cats[r.category] ??= []).push(r);
    }
}

const categories = Object.keys(cats).sort().map(n => ({ name: n, count: cats[n].length, slug: slugify(n) }));
writeFileSync(join(DIST_DIR, "categories.json"), JSON.stringify({ generatedAt: new Date().toISOString(), categories }, null, 2));
Object.entries(cats).forEach(([n, apps]) => writeFileSync(join(DIST_DIR, "categories", `${slugify(n)}.json`), JSON.stringify({ name: n, apps: apps.sort((a, b) => a.name.localeCompare(b.name)) }, null, 2)));
writeFileSync(join(DIST_DIR, "NPIndex"), "#!NPINDEX1 official\n\n" + index.join("\n") + "\n");

console.log(`\nNPIndex: ${index.length} apps | categories.json: ${categories.length} categories`);
