import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve, sep } from "node:path";
import { defineConfig } from "vitest/config";
import type { Connect } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));
const assetRoot = resolve(rootDir, "assets");

const ASSET_CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function assetContentType(path: string): string {
  return ASSET_CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function isInsideAssetRoot(path: string): boolean {
  return path === assetRoot || path.startsWith(`${assetRoot}${sep}`);
}

function removeFilePreviewHelper(html: string): string {
  return html.replace(/\s*<script src="\.\/file-preview\.js"><\/script>/, "");
}

async function serveRootAsset(
  url: string | undefined,
  response: ServerResponse,
  next: Connect.NextFunction
): Promise<void> {
  const pathname = decodeURIComponent((url ?? "").split("?")[0] ?? "");
  const filePath = resolve(assetRoot, `.${pathname}`);
  if (!isInsideAssetRoot(filePath)) {
    next();
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      next();
      return;
    }
    response.setHeader("Content-Type", assetContentType(filePath));
    createReadStream(filePath).pipe(response);
  } catch {
    next();
  }
}

export default defineConfig({
  root: "src",
  cacheDir: "../.cache/vite",
  publicDir: false,
  plugins: [
    {
      name: "serve-root-assets-in-dev",
      configureServer(server) {
        server.middlewares.use("/assets", (request, response, next) => {
          void serveRootAsset(request.url, response, next);
        });
      }
    },
    {
      name: "remove-file-preview-helper-from-build",
      apply: "build",
      enforce: "pre",
      transformIndexHtml(html, context) {
        return context.path.endsWith("/popup/index.html") ? removeFilePreviewHelper(html) : html;
      }
    }
  ],
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
