import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist", "chromium");
const manifestPath = path.join(root, "manifests", "chromium.json");

const manifest = JSON.parse(
  await import("node:fs/promises").then(({ readFile }) => readFile(manifestPath, "utf8"))
);

await mkdir(path.join(dist, "assets"), { recursive: true });
await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
await writeFile(path.join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
