import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_PATH = path.join(ROOT, "src", "shared", "ui.css");
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%2384d8ff'/%3E%3Ccircle cx='18' cy='20' r='13' fill='%23ff7c00'/%3E%3Cellipse cx='34' cy='29' rx='18' ry='11' fill='%238b7cff'/%3E%3Cpath d='M16 36l-5 12M27 36l-5 12M38 36l-5 12' stroke='%23fff' stroke-width='3'/%3E%3C/svg%3E";
const RADAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='577' height='400'%3E%3Crect width='577' height='400' fill='%2359c7df'/%3E%3Cpath d='M0 70 C90 20 190 120 280 70 S470 10 577 85' stroke='%2327bf45' stroke-width='45' fill='none'/%3E%3Cpath d='M20 210 C130 130 235 250 330 180 S470 160 560 230' stroke='%23fff000' stroke-width='26' fill='none'/%3E%3Cpath d='M0 330 C110 270 210 370 330 300 S480 260 577 340' stroke='%23269bd8' stroke-width='55' fill='none'/%3E%3C/svg%3E";

interface LayoutScenario {
  days?: [string, string][];
  lang?: string;
  readings?: [string, string][];
  warnings: string;
  special: string;
  specialTitle?: string;
  title?: string;
}

const scenarios: Array<LayoutScenario & { name: string }> = [
  {
    name: "two warnings",
    warnings: `
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-rain-amber"><img class="warning-signal-icon" src="${ICON}" alt="黃色暴雨警告信號"></button>
    `,
    special: "暴雨警告信號"
  },
  {
    name: "four warnings",
    warnings: `
      <button class="warning-signal warning-signal-rain-black"><img class="warning-signal-icon" src="${ICON}" alt="黑色暴雨警告信號"></button>
      <button class="warning-signal warning-signal-landslip"><img class="warning-signal-icon" src="${ICON}" alt="山泥傾瀉警告"></button>
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-flooding"><img class="warning-signal-icon" src="${ICON}" alt="新界北部水浸特別報告"></button>
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
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-rain-amber"><img class="warning-signal-icon" src="${ICON}" alt="黃色暴雨警告信號"></button>
    `,
    special: "雷暴警告信號、黃色暴雨警告信號、山泥傾瀉警告及強烈季候風信號"
  },
  {
    name: "English heavy rain labels",
    lang: "en",
    title: "Heavy Rain",
    readings: [
      ["Temperature", "24°"],
      ["Humidity", "94%"],
      ["UV Index", "0.1 <small>(low)</small>"]
    ],
    warnings: `
      <button class="warning-signal warning-signal-rain-black"><img class="warning-signal-icon" src="${ICON}" alt="Black Rainstorm Warning Signal"></button>
      <button class="warning-signal warning-signal-landslip"><img class="warning-signal-icon" src="${ICON}" alt="Landslip Warning"></button>
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="Thunderstorm Warning"></button>
      <button class="warning-signal warning-signal-flooding"><img class="warning-signal-icon" src="${ICON}" alt="Special Announcement on Flooding in the northern New Territories"></button>
    `,
    special:
      "Intense gusts reaching 85 kilometres per hour or above may continue to affect Hong Kong. Members of public should seek shelter.",
    specialTitle: "Special Weather Tips",
    days: [
      ["6/19 Fri", "27-31 °C"],
      ["6/20 Sat", "28-32 °C"],
      ["6/21 Sun", "28-33 °C"],
      ["6/22 Mon", "28-33 °C"],
      ["6/23 Tue", "28-33 °C"],
      ["6/24 Wed", "28-33 °C"],
      ["6/25 Thu", "28-32 °C"]
    ]
  }
];

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
          specialContentDisplay: getComputedStyle(
            document.querySelector(".special-weather-content")!
          ).display,
          specialContentLineClamp: getComputedStyle(
            document.querySelector(".special-weather-content")!
          ).webkitLineClamp,
          titleText: rect(".legacy-weather-title"),
          titleTextClientWidth:
            document.querySelector<HTMLElement>(".legacy-weather-title")!.clientWidth,
          titleTextOverflow: getComputedStyle(document.querySelector(".legacy-weather-title")!)
            .textOverflow,
          titleTextScrollWidth:
            document.querySelector<HTMLElement>(".legacy-weather-title")!.scrollWidth,
          meta: rect(".legacy-meta"),
          warning: rect(".warning-signal-row"),
          forecastItemsInside: allInside(".legacy-forecast", ".legacy-forecast-day"),
          signalItemsInside: allInside(".warning-signal-row", ".warning-signal"),
          signalCount: document.querySelectorAll(".warning-signal").length,
          signalIconCount: document.querySelectorAll(".warning-signal-icon").length,
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
      expect(layout.titleText.right).toBeLessThanOrEqual(layout.special.left - 4);
      expect(layout.titleTextScrollWidth).toBeLessThanOrEqual(layout.titleTextClientWidth + 1);
      expect(layout.special.right).toBeLessThanOrEqual(layout.side.left - 4);
      expect(layout.special.bottom).toBeLessThanOrEqual(layout.readings.top - 1);
      expect(layout.specialContent.height).toBeGreaterThanOrEqual(54);
      if (scenario.lang === "en") {
        expect(layout.specialContentDisplay).toBe("block");
        expect(layout.specialContentLineClamp).not.toBe("4");
        expect(layout.titleTextOverflow).not.toBe("ellipsis");
      }
      expect(layout.meta.top).toBeGreaterThanOrEqual(layout.forecast.bottom);
      expect(layout.meta.right).toBeLessThanOrEqual(layout.shell.right - 12);
      expect(layout.meta.bottom).toBeLessThanOrEqual(layout.shell.bottom - 4);
      expect(layout.forecastItemsInside).toBe(true);
      expect(layout.signalItemsInside).toBe(true);
      expect(layout.signalIconCount).toBe(layout.signalCount);
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

  test("collapses expanded imagery widget when clicking outside", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    await page.locator(".imagery-preview").click();
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);

    await page.locator(".radar-range").first().click();
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);

    await page.locator(".legacy-forecast-day").first().click();
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
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
      node.style.setProperty("--range-count", "2");
      node.innerHTML =
        '<button class="radar-range">256km</button><button class="radar-range" aria-selected="true">64km</button>';
    });

    await expect(page.locator(".imagery-snapshot")).toHaveCount(5);
    await expect(page.locator(".radar-range")).toHaveText(["256km", "64km"]);
    await expect(page.locator(".radar-range", { hasText: "128km" })).toHaveCount(0);

    const gridColumnCount = await page.locator(".radar-ranges").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    });
    expect(gridColumnCount).toBe(2);
  });
});

async function fixtureHtml({
  days: scenarioDays,
  lang = "zh-Hant",
  readings: scenarioReadings,
  special,
  specialTitle = "特別天氣提示",
  title = "大雨",
  warnings
}: LayoutScenario) {
  const css = await readFile(CSS_PATH, "utf8");
  const days = scenarioDays ?? [
    ["6/19 五", "27-31 度"],
    ["6/20 六", "28-32 度"],
    ["6/21 日", "28-33 度"],
    ["6/22 一", "28-33 度"],
    ["6/23 二", "28-33 度"],
    ["6/24 三", "28-33 度"],
    ["6/25 四", "28-32 度"]
  ];
  const readings = scenarioReadings ?? [
    ["現時氣溫", "28°"],
    ["相對濕度", "87%"],
    ["紫外線指數", "0.4 <small>(低)</small>"]
  ];

  return `<!doctype html>
    <html lang="${lang}" class="popup-page">
      <head><meta charset="utf-8"><style>${css}</style></head>
      <body class="popup-page">
        <main class="popup-shell legacy-weather">
          <div class="window-notch" aria-hidden="true"></div>
          <div class="legacy-actions"><button class="legacy-icon-button">⚙</button><button class="legacy-icon-button">⟳</button></div>
          <section class="legacy-content">
            <section class="legacy-current">
              <div class="current-title-row"><span class="weather-icon-frame"><img class="main-weather-icon" src="${ICON}" alt=""></span><span class="legacy-weather-title">${title}</span></div>
              <div class="legacy-readings">
                ${readings.map(([label, value], index) => `<div class="legacy-reading${index === 2 ? " legacy-reading-uv" : ""}"><span>${label}</span><strong>${value}</strong></div>`).join("")}
              </div>
              <div class="warning-signal-row">${warnings}</div>
              <button class="special-weather-card"><div class="special-weather-title">${specialTitle}</div><div class="special-weather-content">${special}</div></button>
            </section>
            <section class="legacy-side-panel">
              <div class="imagery-card"><div class="imagery-tabs"><button class="imagery-tab" aria-selected="true">雷達</button><button class="imagery-tab">閃電</button></div><div class="imagery-preview"><img class="imagery-image-crop-map" src="${RADAR}" alt=""><div class="imagery-snapshots"><button class="imagery-snapshot">1</button><button class="imagery-snapshot">2</button><button class="imagery-snapshot">3</button><button class="imagery-snapshot">4</button><button class="imagery-snapshot" aria-selected="true">5</button></div></div><div class="imagery-caption"><span>等雨量線圖</span><span>12:06</span></div><div class="radar-ranges"><button class="radar-range">256km</button><button class="radar-range">128km</button><button class="radar-range" aria-selected="true">64km</button></div></div>
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
        <script>
          const imageryCard = document.querySelector(".imagery-card");
          const imageryPreview = document.querySelector(".imagery-preview");
          const title = document.querySelector(".legacy-weather-title");
          const special = document.querySelector(".special-weather-card");
          if (title instanceof HTMLElement && special instanceof HTMLElement) {
            title.style.removeProperty("font-size");
            title.style.removeProperty("max-width");
            const titleRect = title.getBoundingClientRect();
            const specialRect = special.getBoundingClientRect();
            title.style.maxWidth = Math.floor(Math.max(110, specialRect.left - titleRect.left - 8)) + "px";
            title.style.fontSize = "40px";
            for (let size = 40; size > 24 && title.scrollWidth > title.clientWidth; size -= 1) {
              title.style.fontSize = (size - 1) + "px";
            }
          }
          imageryPreview?.addEventListener("click", () => {
            imageryCard?.classList.toggle("is-expanded");
          });
          document.addEventListener("click", (event) => {
            if (!imageryCard?.classList.contains("is-expanded")) return;
            if (event.target instanceof Node && imageryCard.contains(event.target)) return;
            imageryCard.classList.remove("is-expanded");
          }, { capture: true });
        </script>
      </body>
    </html>`;
}
