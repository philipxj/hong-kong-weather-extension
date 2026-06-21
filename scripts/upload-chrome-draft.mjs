import { readFile } from "node:fs/promises";
import console from "node:console";
import { argv, env } from "node:process";
import path from "node:path";
import { formatPayload, uploadChromeDraft } from "./chrome-web-store-api.mjs";

const zipPath = argv[2];

if (!zipPath) {
  throw new Error("Usage: node scripts/upload-chrome-draft.mjs <extension.zip>");
}

const submitReview = env.CHROME_SUBMIT_REVIEW === "true";
const { uploadPayload, publishPayload } = await uploadChromeDraft({
  zipPath,
  env,
  fetchImpl: globalThis.fetch,
  readFileImpl: readFile,
  submitReview
});

console.log(`Uploaded Chrome draft package ${path.basename(zipPath)}.`);
console.log(formatPayload(uploadPayload));

if (publishPayload) {
  console.log("Submitted Chrome draft for review.");
  console.log(formatPayload(publishPayload));
} else {
  console.log("Chrome publish endpoint was not called; submit review manually in the dashboard.");
}
