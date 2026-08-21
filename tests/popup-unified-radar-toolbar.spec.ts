import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const UI_CSS_PATH = path.join(ROOT, "src", "shared", "ui.css");
const TOOLBAR_CSS_PATH = path.join(ROOT, "src", "shared", "unified-radar-toolbar.css");
const POPUP_PATH = path.join(ROOT, "src", "popup", "index.html");

interface Box {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test("keeps the unified radar toolbar compact in normal and expanded previews", async ({ page }) => {
  await page.setViewportSize({ width: 790, height: 438 });

  const popupMarkup = await readFile(POPUP_PATH, "utf8");
  await page.setContent(popupMarkup, { waitUntil: "domcontentloaded" });
  const productionParents = await page.evaluate(() => ({
    caption: document.querySelector(".imagery-caption")?.parentElement?.className,
    playback: document.querySelector("#radar-playback")?.parentElement?.className,
    ranges: document.querySelector("#radar-ranges")?.parentElement?.className
  }));
  expect(productionParents).toEqual({
    caption: "imagery-toolbar",
    playback: "imagery-toolbar",
    ranges: "imagery-toolbar"
  });

  const [uiCss, toolbarCss] = await Promise.all([
    readFile(UI_CSS_PATH, "utf8"),
    readFile(TOOLBAR_CSS_PATH, "utf8")
  ]);
  await page.setContent(
    `<!doctype html>
      <html lang="zh-Hant" class="popup-page">
        <head><meta charset="utf-8"><style>${uiCss}\n${toolbarCss}</style></head>
        <body class="popup-page">
          <main class="popup-shell legacy-weather">
            <section class="legacy-content">
              <section class="legacy-side-panel">
                <div class="imagery-card" data-panel="radar">
                  <div class="imagery-preview" role="button" tabindex="0">
                    <div class="imagery-stepper"><span class="imagery-position">5 / 5</span></div>
                  </div>
                  <div class="imagery-toolbar">
                    <div class="radar-playback" data-playing="true">
                      <button class="radar-play-toggle" type="button" aria-label="暫停雷達動畫" aria-pressed="false"><span class="radar-play-icon" aria-hidden="true"></span></button>
                      <input class="radar-playback-slider" type="range" min="1" max="5" step="1" value="5" aria-label="雷達動畫格數">
                      <output class="radar-playback-position">5/5</output>
                    </div>
                    <span class="imagery-toolbar-divider radar-playback-divider" aria-hidden="true"></span>
                    <div class="imagery-caption"><span>時間</span><span>12:06</span></div>
                    <span class="imagery-toolbar-divider" aria-hidden="true"></span>
                    <div class="radar-ranges" style="--range-count: 3">
                      <button class="radar-range" aria-label="256公里" title="256公里">256</button>
                      <button class="radar-range" aria-label="128公里" title="128公里">128</button>
                      <button class="radar-range" aria-label="64公里" title="64公里" aria-selected="true">64</button>
                    </div>
                  </div>
                </div>
              </section>
            </section>
          </main>
        </body>
      </html>`,
    { waitUntil: "domcontentloaded" }
  );

  const measure = () =>
    page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing fixture element: ${selector}`);
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          height: box.height,
          left: box.left,
          right: box.right,
          top: box.top,
          width: box.width
        };
      };
      return {
        caption: rect(".imagery-caption"),
        firstDivider: rect(".radar-playback-divider"),
        playback: rect(".radar-playback"),
        playToggle: rect(".radar-play-toggle"),
        preview: rect(".imagery-preview"),
        ranges: rect(".radar-ranges"),
        secondDivider: rect(".imagery-toolbar-divider:not(.radar-playback-divider)"),
        slider: rect(".radar-playback-slider"),
        toolbar: rect(".imagery-toolbar")
      };
    });

  const compact = await measure();
  expect(Math.round(compact.toolbar.width)).toBe(242);
  expect(Math.round(compact.toolbar.height)).toBe(27);
  expect(Math.round(compact.toolbar.left - compact.preview.left)).toBe(6);
  expect(Math.round(compact.preview.bottom - compact.toolbar.bottom)).toBe(6);
  expect(compact.toolbar.right).toBeLessThanOrEqual(compact.preview.right);
  expect(Math.round(compact.playback.width)).toBe(97);
  expect(Math.round(compact.playToggle.width)).toBe(18);
  expect(Math.round(compact.playToggle.height)).toBe(18);
  expect(compact.slider.width).toBeGreaterThanOrEqual(48);
  expect(overlaps(compact.playback, compact.firstDivider)).toBe(false);
  expect(overlaps(compact.firstDivider, compact.caption)).toBe(false);
  expect(overlaps(compact.caption, compact.secondDivider)).toBe(false);
  expect(overlaps(compact.secondDivider, compact.ranges)).toBe(false);
  expect(await page.locator(".radar-range").allTextContents()).toEqual(["256", "128", "64"]);
  expect(
    await page.locator(".radar-range").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label"))
    )
  ).toEqual(["256公里", "128公里", "64公里"]);

  const playBackground = await page.locator(".radar-play-toggle").evaluate((node) => {
    return getComputedStyle(node).backgroundColor;
  });
  await page.locator(".radar-play-toggle").hover();
  const hoveredPlayBackground = await page.locator(".radar-play-toggle").evaluate((node) => {
    return getComputedStyle(node).backgroundColor;
  });
  expect(hoveredPlayBackground).toBe(playBackground);
  await expect(page.locator(".radar-playback-position")).toHaveText("5/5");

  await page.locator(".imagery-card").evaluate((node) => node.classList.add("is-expanded"));
  const expanded = await measure();
  expect(Math.round(expanded.toolbar.width)).toBe(242);
  expect(Math.round(expanded.toolbar.height)).toBe(27);
  expect(Math.round(expanded.toolbar.left - expanded.preview.left)).toBe(6);
  expect(Math.round(expanded.preview.bottom - expanded.toolbar.bottom)).toBe(6);
  expect(Math.round(expanded.slider.width)).toBe(Math.round(compact.slider.width));
  expect(overlaps(expanded.playback, expanded.caption)).toBe(false);
  expect(overlaps(expanded.caption, expanded.ranges)).toBe(false);

  await page.locator(".imagery-card").evaluate((node) => {
    node.classList.remove("is-expanded");
    node.setAttribute("data-panel", "typhoon");
  });
  await expect(page.locator(".imagery-toolbar")).toBeHidden();
});
