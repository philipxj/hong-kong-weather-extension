import { readFile } from "node:fs/promises";
import console from "node:console";
import { argv, env } from "node:process";
import path from "node:path";
import { formatPayload, uploadEdgeDraft } from "./edge-addons-api.mjs";

const zipPath = argv[2];

if (!zipPath) {
  throw new Error("Usage: node scripts/upload-edge-draft.mjs <extension.zip>");
}

const result = await uploadEdgeDraft({
  zipPath,
  env,
  fetchImpl: globalThis.fetch,
  readFileImpl: readFile,
  submitReview: env.EDGE_SUBMIT_REVIEW === "true"
});

console.log(`Uploaded Edge draft package ${path.basename(zipPath)}.`);
console.log(`Edge upload operation: ${result.uploadOperationId}`);
console.log(`Edge upload response: ${formatPayload(result.uploadPayload)}`);

if (result.publishOperationId) {
  console.log(`Submitted Edge draft for review. Publish operation: ${result.publishOperationId}`);
  console.log(`Edge publish response: ${formatPayload(result.publishPayload ?? {})}`);
} else {
  console.log("Edge publish endpoint was not called; submit review manually in Partner Center.");
}
