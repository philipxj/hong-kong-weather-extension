import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "src",
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: "../dist/chromium",
    rollupOptions: {
      input: {
        background: resolve(rootDir, "src/background.ts"),
        options: resolve(rootDir, "src/options/index.html"),
        popup: resolve(rootDir, "src/popup/index.html")
      },
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "[name].js"
      }
    }
  },
  test: {
    include: ["../tests/**/*.test.ts"]
  }
});
