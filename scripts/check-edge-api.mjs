import console from "node:console";
import { argv, env } from "node:process";
import { checkEdgeApi } from "./edge-api-check.mjs";

const result = await checkEdgeApi({
  env,
  operationId: argv[2] ?? "",
  fetchImpl: globalThis.fetch
});
console.log(`Edge API authenticated GET succeeded (HTTP ${result.httpStatus}).`);
console.log(`Historical publish operation status: ${result.operationStatus}.`);
console.log("No package was uploaded and no submission was created.");
