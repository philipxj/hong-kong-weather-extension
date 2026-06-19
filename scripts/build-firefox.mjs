import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const chromiumDist = path.join(root, "dist", "chromium");
const firefoxDist = path.join(root, "dist", "firefox");
const manifestPath = path.join(root, "manifests", "firefox.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

await rm(firefoxDist, { recursive: true, force: true });
await mkdir(path.dirname(firefoxDist), { recursive: true });
await cp(chromiumDist, firefoxDist, { recursive: true });
await writeFile(path.join(firefoxDist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
