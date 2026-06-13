import { readFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.NIGHTFALLS_BASE_URL ?? null;
const staticRoot = process.env.NIGHTFALLS_STATIC_ROOT ?? ".next/server/app";

const routes = [
  {
    path: "/",
    markers: [
      "Plan the shot before the sky changes.",
      "Sunset photography field guide",
      "Crawlable local guides",
    ],
  },
  {
    path: "/App?lat=49.2827&lon=-123.1207&tab=map",
    markers: ["Choose the sky, then choose the place.", "Map View"],
  },
  {
    path: "/locations/vancouver-bc",
    markers: ["Best sunset spots", "Vancouver, BC", "Recommended viewpoints"],
  },
  {
    path: "/FAQ",
    markers: ["Sunset photography FAQ", "Belt of Venus"],
  },
  {
    path: "/llms.txt",
    markers: ["Nightfalls", "sunset photography planning app"],
  },
];

const mojibakePattern = /\\u00c2|\\u00ce|\\u00cf|\\u00e2|\\u00f0|\\u0178|\\u0152/;

for (const route of routes) {
  const body = baseUrl
    ? await fetchRouteBody(route.path)
    : await readStaticRouteBody(route.path);

  for (const marker of route.markers) {
    if (!body.includes(marker)) {
      throw new Error(`${route.path} is missing marker: ${marker}`);
    }
  }

  if (mojibakePattern.test(body)) {
    throw new Error(`${route.path} contains mojibake-like text`);
  }

  console.log(`ok ${route.path}`);
}

async function fetchRouteBody(path) {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.text();
}

async function readStaticRouteBody(path) {
  const filePath = getStaticFilePath(path);

  return readFile(filePath, "utf8");
}

function getStaticFilePath(path) {
  if (path === "/") {
    return join(staticRoot, "index.html");
  }

  if (path === "/llms.txt") {
    return "public/llms.txt";
  }

  const cleanPath = path.split("?")[0].replace(/^\//, "");

  return join(staticRoot, `${cleanPath}.html`);
}

