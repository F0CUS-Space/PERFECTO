#!/usr/bin/env node
/**
 * Copy an npm package and its production dependency tree into a slim runtime image.
 * Usage: node copy-node-module-tree.cjs <sourceNodeModules> <destNodeModules> <packageName>
 */
const fs = require("fs");
const path = require("path");

const [sourceRoot, destRoot, rootPkg] = process.argv.slice(2);
if (!sourceRoot || !destRoot || !rootPkg) {
  console.error("Usage: node copy-node-module-tree.cjs <source> <dest> <package>");
  process.exit(1);
}

const copied = new Set();

function pkgDir(root, name) {
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    return path.join(root, scope, pkg);
  }
  return path.join(root, name);
}

function copyPkg(name) {
  if (copied.has(name)) return;

  const src = pkgDir(sourceRoot, name);
  if (!fs.existsSync(src)) return;

  copied.add(name);

  const dest = pkgDir(destRoot, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });

  const pkgJsonPath = path.join(src, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return;

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const deps = { ...pkgJson.dependencies, ...pkgJson.optionalDependencies };
  for (const dep of Object.keys(deps ?? {})) {
    copyPkg(dep);
  }
}

copyPkg(rootPkg);
console.log(`Copied ${copied.size} packages for ${rootPkg}: ${[...copied].join(", ")}`);
