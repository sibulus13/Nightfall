import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const sourceRoots = ["src/app", "src/components"];
const ignoredExtensions = new Set([".ico", ".png", ".jpg", ".jpeg", ".webp"]);
const mojibakePattern = /\u00c2|\u00ce|\u00cf|\u00e2|\u00f0|\u0178|\u0152/;
const hexPattern = /#[0-9a-fA-F]{3,8}/g;

const files = [];

for (const root of sourceRoots) {
  await collectFiles(root, files);
}

const findings = [];
let hardcodedHexCount = 0;

for (const file of files) {
  const body = await readFile(file, "utf8");

  if (mojibakePattern.test(body)) {
    findings.push(`${file}: mojibake-like text detected`);
  }

  const hexMatches = body.match(hexPattern) ?? [];
  hardcodedHexCount += hexMatches.length;
}

const navbar = await readFile("src/components/navbar.tsx", "utf8");
const appLinks = Array.from(navbar.matchAll(/href="\/App"/g));

if (appLinks.length > 1) {
  findings.push(`src/components/navbar.tsx: duplicate /App nav actions`);
}

console.log(`hardcodedHexCount=${hardcodedHexCount}`);

if (findings.length > 0) {
  throw new Error(findings.join("\n"));
}

console.log("design audit ok");

async function collectFiles(directory, output) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await collectFiles(path, output);
      continue;
    }

    if ([...ignoredExtensions].some((extension) => path.endsWith(extension))) {
      continue;
    }

    if (/\.(tsx|ts|css|mjs)$/.test(path)) {
      output.push(path);
    }
  }
}
