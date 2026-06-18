import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_PATH = path.join(ROOT, "src", "shared", "ui.css");
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%2384d8ff'/%3E%3Ccircle cx='18' cy='20' r='13' fill='%23ff7c00'/%3E%3Cellipse cx='34' cy='29' rx='18' ry='11' fill='%238b7cff'/%3E%3Cpath d='M16 36l-5 12M27 36l-5 12M38 36l-5 12' stroke='%23fff' stroke-width='3'/%3E%3C/svg%3E";
const RADAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='577' height='400'%3E%3Crect width='577' height='400' fill='%2359c7df'/%3E%3Cpath d='M0 70 C90 20 190 120 280 70 S470 10 577 85' stroke='%2327bf45' stroke-width='45' fill='none'/%3E%3Cpath d='M20 210 C130 130 235 250 330 180 S470 160 560 230' stroke='%23fff000' stroke-width='26' fill='none'/%3E%3Cpath d='M0 330 C110 270 210 370 330 300 S480 260 577 340' stroke='%23269bd8' stroke-width='55' fill='none'/%3E%3C/svg%3E";

const scenarios = [
  {
    name: "two warnings",
    warnings: `
      <div class="warning-signal warning-signal-thunderstorm"><span class="lightning-mark">⚡</span><span class="signal-text">雷暴<small>Thunderstorm</small></span></div>
      <div class="warning-signal warning-signal-rain-amber"><span class="rain-block">黃雨</span></div>
    `,
    special: "暴雨警告信號"
  },
  {
    name: "four warnings",
    warnings: `
      <div class="warning-signal warning-signal-rain-black"><span class="rain-block">黑雨</span></div>
      <div class="warning-signal warning-signal-landslip"><span class="landslip-mark"><span>山泥</span></span></div>
      <div class="warning-signal warning-signal-thunderstorm"><span class="lightning-mark">⚡</span><span class="signal-text">雷暴<small>Thunderstorm</small></span></div>
      <div class="warning-signal warning-signal-flooding"><span class="signal-text signal-text-wide">水浸<small>Flooding</small></span></div>
    `,
    special: "黑色暴雨警告信號、山泥傾瀉警告、雷暴警告、新界北部水浸特別報告"
  },
  {
    name: "no warnings with long labels",
    warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
    special: "沒有生效提示"
  },
  {
    name: "long warning text",
    warnings: `
      <div class="warning-signal warning-signal-thunderstorm"><span class="lightning-mark">⚡</span><span class="signal-text">雷暴<small>Thunderstorm</small></span></div>
      <div class="warning-signal warning-signal-rain-amber"><span class="rain-block">黃雨</span></div>
    `,
    special: "雷暴警告信號、黃色暴雨警告信號、山泥傾瀉警告及強烈季候風信號"
  }
];

interface LayoutScenario {
  warnings: string;
  special: string;
}

test.describe("popup layout", () => {
  for (const scenario of scenarios) {
    test(`does not overlap in ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 790, height: 438 });
      await page.setContent(await fixtureHtml(scenario), { waitUntil: "domcontentloaded" });

      const layout = await page.evaluate(() => {
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
        const allInside = (parentSelector: string, childSelector: string) => {
          const parent = rect(parentSelector);
          return [...document.querySelectorAll(childSelector)].every((node) => {
            const box = node.getBoundingClientRect();
            return (
              box.left >= parent.left &&
              box.right <= parent.right &&
              box.top >= parent.top &&
              box.bottom <= parent.bottom
            );
          });
        };

        return {
          current: rect(".legacy-current"),
          currentTitle: rect(".current-title-row"),
          readings: rect(".legacy-readings"),
          forecast: rect(".legacy-forecast"),
          shell: rect(".popup-shell"),
          side: rect(".legacy-side-panel"),
          special: rect(".special-weather-card"),
          specialContent: rect(".special-weather-content"),
          meta: rect(".legacy-meta"),
          warning: rect(".warning-signal-row"),
          forecastItemsInside: allInside(".legacy-forecast", ".legacy-forecast-day"),
          signalItemsInside: allInside(".warning-signal-row", ".warning-signal"),
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      });

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
      expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight);
      expect(layout.forecast.bottom).toBeLessThanOrEqual(layout.shell.bottom - 12);
      expect(layout.warning.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
      expect(layout.side.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
      expect(layout.special.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
      expect(Math.abs(layout.special.top - layout.currentTitle.top)).toBeLessThanOrEqual(8);
      expect(layout.special.right).toBeLessThanOrEqual(layout.side.left - 4);
      expect(layout.special.bottom).toBeLessThanOrEqual(layout.readings.top - 1);
      expect(layout.specialContent.height).toBeGreaterThanOrEqual(54);
      expect(layout.meta.top).toBeGreaterThanOrEqual(layout.forecast.bottom);
      expect(layout.meta.right).toBeLessThanOrEqual(layout.shell.right - 12);
      expect(layout.meta.bottom).toBeLessThanOrEqual(layout.shell.bottom - 4);
      expect(layout.forecastItemsInside).toBe(true);
      expect(layout.signalItemsInside).toBe(true);
    });
  }

  test("expands radar widget by about thirty percent", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );
    await page.locator(".imagery-card").evaluate((node) => node.classList.add("is-expanded"));

    const layout = await page.evaluate(() => {
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
        card: rect(".imagery-card"),
        preview: rect(".imagery-preview"),
        shell: rect(".popup-shell")
      };
    });

    expect(layout.card.width).toBeGreaterThanOrEqual(466);
    expect(layout.preview.height).toBeGreaterThanOrEqual(281);
    expect(layout.card.left).toBeGreaterThanOrEqual(layout.shell.left);
    expect(layout.card.right).toBeLessThanOrEqual(layout.shell.right - 12);
  });

  test("supports lightning snapshots with available ranges only", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );
    await page
      .locator(".imagery-tab")
      .nth(1)
      .evaluate((node) => {
        node.setAttribute("aria-selected", "true");
        node.previousElementSibling?.setAttribute("aria-selected", "false");
      });
    await page
      .locator(".imagery-caption span")
      .first()
      .evaluate((node) => {
        node.textContent = "閃電位置";
      });
    await page.locator(".radar-ranges").evaluate((node) => {
      node.innerHTML =
        '<button class="radar-range">256km</button><button class="radar-range" aria-selected="true">64km</button>';
    });

    await expect(page.locator(".imagery-snapshot")).toHaveCount(5);
    await expect(page.locator(".radar-range")).toHaveText(["256km", "64km"]);
    await expect(page.locator(".radar-range", { hasText: "128km" })).toHaveCount(0);
  });
});

async function fixtureHtml({ warnings, special }: LayoutScenario) {
  const css = await readFile(CSS_PATH, "utf8");
  const days = [
    ["6/19 五", "27-31 度"],
    ["6/20 六", "28-32 度"],
    ["6/21 日", "28-33 度"],
    ["6/22 一", "28-33 度"],
    ["6/23 二", "28-33 度"],
    ["6/24 三", "28-33 度"],
    ["6/25 四", "28-32 度"]
  ];

  return `<!doctype html>
    <html lang="zh-Hant" class="popup-page">
      <head><meta charset="utf-8"><style>${css}</style></head>
      <body class="popup-page">
        <main class="popup-shell legacy-weather">
          <div class="window-notch" aria-hidden="true"></div>
          <div class="legacy-actions"><button class="legacy-icon-button">⚙</button><button class="legacy-icon-button">⟳</button></div>
          <section class="legacy-content">
            <section class="legacy-current">
              <div class="current-title-row"><span class="weather-icon-frame"><img class="main-weather-icon" src="${ICON}" alt=""></span><span class="legacy-weather-title">大雨</span></div>
              <div class="legacy-readings">
                <div class="legacy-reading"><span>現時氣溫</span><strong>28°</strong></div>
                <div class="legacy-reading"><span>相對濕度</span><strong>87%</strong></div>
                <div class="legacy-reading legacy-reading-uv"><span>紫外線指數</span><strong>0.4 <small>(低)</small></strong></div>
              </div>
              <div class="warning-signal-row">${warnings}</div>
              <button class="special-weather-card"><div class="special-weather-title">特別天氣提示</div><div class="special-weather-content">${special}</div></button>
            </section>
            <section class="legacy-side-panel">
              <div class="imagery-card"><div class="imagery-tabs"><button class="imagery-tab" aria-selected="true">雷達</button><button class="imagery-tab">閃電</button></div><div class="imagery-preview"><img class="imagery-image-crop-radar" src="${RADAR}" alt=""><div class="imagery-snapshots"><button class="imagery-snapshot">1</button><button class="imagery-snapshot">2</button><button class="imagery-snapshot">3</button><button class="imagery-snapshot">4</button><button class="imagery-snapshot" aria-selected="true">5</button></div></div><div class="imagery-caption"><span>等雨量線圖</span><span>12:06</span></div><div class="radar-ranges"><button class="radar-range">256km</button><button class="radar-range">128km</button><button class="radar-range" aria-selected="true">64km</button></div></div>
              <button class="typhoon-map-button">颱風 尤特 路徑圖</button>
            </section>
            <section class="legacy-forecast">
              <div class="legacy-forecast-list">
                ${days.map(([date, temp]) => `<div class="legacy-forecast-day"><div class="legacy-forecast-date">${date}</div><img class="legacy-forecast-icon" src="${ICON}" alt=""><div class="legacy-forecast-temp">${temp}</div></div>`).join("")}
              </div>
            </section>
            <div class="legacy-meta"><span class="timestamp">13:30 更新</span></div>
          </section>
        </main>
      </body>
    </html>`;
}
