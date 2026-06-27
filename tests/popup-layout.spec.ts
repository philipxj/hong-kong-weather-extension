import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  sidePanelFullTitle,
  sidePanelTabTitle,
  type ImageryPanelType
} from "../src/popup/imagery-tabs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_PATH = path.join(ROOT, "src", "shared", "ui.css");
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%2384d8ff'/%3E%3Ccircle cx='18' cy='20' r='13' fill='%23ff7c00'/%3E%3Cellipse cx='34' cy='29' rx='18' ry='11' fill='%238b7cff'/%3E%3Cpath d='M16 36l-5 12M27 36l-5 12M38 36l-5 12' stroke='%23fff' stroke-width='3'/%3E%3C/svg%3E";
const RADAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='577' height='400'%3E%3Crect width='577' height='400' fill='%2359c7df'/%3E%3Cpath d='M0 70 C90 20 190 120 280 70 S470 10 577 85' stroke='%2327bf45' stroke-width='45' fill='none'/%3E%3Cpath d='M20 210 C130 130 235 250 330 180 S470 160 560 230' stroke='%23fff000' stroke-width='26' fill='none'/%3E%3Cpath d='M0 330 C110 270 210 370 330 300 S480 260 577 340' stroke='%23269bd8' stroke-width='55' fill='none'/%3E%3C/svg%3E";
const TRACK_MAP =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='912'%3E%3Crect width='720' height='700' fill='%23097daf'/%3E%3Cpath d='M0 120h720M0 260h720M0 400h720M0 540h720M120 0v700M300 0v700M480 0v700M660 0v700' stroke='%23ffffff' stroke-opacity='.22' stroke-width='3'/%3E%3Cpath d='M610 0 540 80 485 150 390 220 330 310 315 430 260 540 250 700' stroke='%23ffffff' stroke-width='8' fill='none'/%3E%3Ccircle cx='540' cy='80' r='18' fill='%2314a04b' stroke='%23ffffff' stroke-width='5'/%3E%3Ccircle cx='220' cy='610' r='12' fill='%23ff4f72' stroke='%23ffffff' stroke-width='4'/%3E%3Crect y='700' width='720' height='212' fill='%23ffffff'/%3E%3Ctext x='48' y='770' font-family='Arial' font-size='34' fill='%23111'%3ETropical Depression%3C/text%3E%3Ctext x='48' y='835' font-family='Arial' font-size='34' fill='%23111'%3ETropical Storm%3C/text%3E%3Ctext x='390' y='770' font-family='Arial' font-size='34' fill='%23111'%3ETyphoon%3C/text%3E%3Ctext x='390' y='835' font-family='Arial' font-size='34' fill='%23111'%3EHong Kong%3C/text%3E%3C/svg%3E";

interface Rect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface LayoutScenario {
  activePanel?: ImageryPanelType;
  days?: [string, string][];
  lang?: string;
  readings?: [string, string][];
  scene?: string;
  warnings: string;
  special: string | null;
  specialTitle?: string;
  title?: string;
  tropicalCycloneCount?: number;
  tropicalCyclone?: string | null;
}

const scenarios: Array<LayoutScenario & { name: string }> = [
  {
    name: "two warnings",
    warnings: `
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-rain-amber"><img class="warning-signal-icon" src="${ICON}" alt="黃色暴雨警告信號"></button>
    `,
    special: "局部地區有大雨"
  },
  {
    name: "four warnings",
    warnings: `
      <button class="warning-signal warning-signal-rain-black"><img class="warning-signal-icon" src="${ICON}" alt="黑色暴雨警告信號"></button>
      <button class="warning-signal warning-signal-landslip"><img class="warning-signal-icon" src="${ICON}" alt="山泥傾瀉警告"></button>
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-flooding"><img class="warning-signal-icon" src="${ICON}" alt="新界北部水浸特別報告"></button>
    `,
    special: "離岸及高地間中吹強風"
  },
  {
    name: "no warnings and no special tips",
    warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
    special: null
  },
  {
    name: "long special weather tip",
    warnings: `
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-rain-amber"><img class="warning-signal-icon" src="${ICON}" alt="黃色暴雨警告信號"></button>
    `,
    special: "高溫天氣可能影響健康，市民應補充足夠水分，避免長時間在戶外曝曬"
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
  },
  {
    name: "active tropical cyclone without Hong Kong warning",
    activePanel: "typhoon",
    warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
    special: null,
    tropicalCyclone: tropicalCycloneView()
  },
  {
    name: "active tropical cyclone and two warnings",
    activePanel: "typhoon",
    warnings: `
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-rain-amber"><img class="warning-signal-icon" src="${ICON}" alt="黃色暴雨警告信號"></button>
    `,
    special: "局部地區有大雨",
    tropicalCyclone: tropicalCycloneView()
  },
  {
    name: "active tropical cyclone and four warnings",
    activePanel: "typhoon",
    warnings: `
      <button class="warning-signal warning-signal-rain-black"><img class="warning-signal-icon" src="${ICON}" alt="黑色暴雨警告信號"></button>
      <button class="warning-signal warning-signal-landslip"><img class="warning-signal-icon" src="${ICON}" alt="山泥傾瀉警告"></button>
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-flooding"><img class="warning-signal-icon" src="${ICON}" alt="新界北部水浸特別報告"></button>
    `,
    special: "離岸及高地間中吹強風",
    tropicalCyclone: tropicalCycloneView("米克拉會在今明兩日橫過琉球群島一帶。", 3),
    tropicalCycloneCount: 3
  },
  {
    name: "long tropical cyclone description",
    activePanel: "typhoon",
    warnings: `
      <button class="warning-signal warning-signal-thunderstorm"><img class="warning-signal-icon" src="${ICON}" alt="雷暴警告"></button>
      <button class="warning-signal warning-signal-rain-amber"><img class="warning-signal-icon" src="${ICON}" alt="黃色暴雨警告信號"></button>
    `,
    special: "局部地區有大雨",
    tropicalCyclone: tropicalCycloneView(
      "米克拉會在今明兩日橫過琉球群島一帶，隨後靠近日本本州南部，相關雨帶可能間中為沿岸帶來狂風驟雨。"
    )
  }
];

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function tropicalCycloneView(
  description = "米克拉會在今明兩日橫過琉球群島一帶，隨後靠近日本本州南部。",
  count = 1
): string {
  const cycloneOptions = [
    {
      description,
      distance: "香港以東約 1150 公里",
      meta: "香港時間 6月25日 08時",
      name: "強烈熱帶風暴 米克拉",
      wind: "每小時 105 公里"
    },
    {
      description: "海高斯正移向華南沿岸以西海域。",
      distance: "香港以西北約 2460 公里",
      meta: "香港時間 6月25日 08時",
      name: "熱帶風暴 海高斯",
      wind: "每小時 85 公里"
    },
    {
      description: "另一熱帶低氣壓位於西北太平洋。",
      distance: "香港以東北約 3180 公里",
      meta: "香港時間 6月25日 08時",
      name: "熱帶低氣壓 無名",
      wind: "每小時 55 公里"
    }
  ].slice(0, count);
  const switcher =
    count > 1
      ? `<select class="tropical-cyclone-select" aria-label="選擇熱帶氣旋">
          ${cycloneOptions.map((cyclone, index) => `<option value="${index}">${cyclone.name}</option>`).join("")}
        </select>`
      : `<select class="tropical-cyclone-select" hidden></select>`;
  const hiddenOptions = cycloneOptions
    .map(
      (cyclone) =>
        `<span class="tropical-cyclone-option" data-name="${cyclone.name}" data-meta="${cyclone.meta}" data-distance="${cyclone.distance}" data-wind="${cyclone.wind}" data-description="${cyclone.description}" hidden></span>`
    )
    .join("");
  return `<div class="tropical-cyclone-view" role="tabpanel">
    <div class="tropical-cyclone-header">
      <span class="tropical-cyclone-kicker">熱帶氣旋</span>
      ${switcher}
    </div>
    <dl class="tropical-cyclone-facts">
      <div><dt>時間</dt><dd class="tropical-cyclone-meta">香港時間 6月25日 08時</dd></div>
      <div><dt>位置</dt><dd class="tropical-cyclone-distance">香港以東約 1150 公里</dd></div>
      <div><dt>風速</dt><dd class="tropical-cyclone-wind">每小時 105 公里</dd></div>
    </dl>
    <p class="tropical-cyclone-description">${description}</p>
    <div class="tropical-cyclone-actions">
      <button class="tropical-cyclone-track-map" type="button" data-track-map-url="https://www.hko.gov.hk/wxinfo/currwx/nwp_2611.png">路徑圖</button>
      <button class="tropical-cyclone-track" type="button"><span class="typhoon-map-label">詳情</span><svg class="external-link-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4H3.5A1.5 1.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h7A1.5 1.5 0 0 0 12 12.5V10"></path><path d="M9 2h5v5"></path><path d="m8 8 6-6"></path></svg></button>
    </div>
    ${hiddenOptions}
  </div>`;
}

test.describe("popup layout", () => {
  test("explains direct file popup loading instead of staying stuck", async ({ page }) => {
    await page.goto(`file://${path.join(ROOT, "src", "popup", "index.html")}`);

    await expect(page.locator("#loading")).toContainText("file://");
    await expect(page.locator("#loading")).not.toHaveText("Loading weather data...");
  });

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
        const optionalRect = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return null;
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
        const tcDescription = document.querySelector<HTMLElement>(".tropical-cyclone-description");
        const tcTab = document.querySelector<HTMLElement>(".imagery-tab[data-panel='typhoon']");
        const activeTab = document.querySelector<HTMLElement>(".imagery-tab[aria-selected='true']");

        return {
          current: rect(".legacy-current"),
          currentTitle: rect(".current-title-row"),
          currentTemp: rect(".legacy-reading:first-child"),
          readings: rect(".legacy-readings"),
          forecast: rect(".legacy-forecast"),
          forecastBackground: getComputedStyle(document.querySelector(".legacy-forecast")!)
            .backgroundColor,
          forecastBorderBottomWidth: getComputedStyle(document.querySelector(".legacy-forecast")!)
            .borderBottomWidth,
          forecastBorderTopWidth: getComputedStyle(document.querySelector(".legacy-forecast")!)
            .borderTopWidth,
          forecastBoxShadow: getComputedStyle(document.querySelector(".legacy-forecast")!)
            .boxShadow,
          forecastDayBackground: getComputedStyle(document.querySelector(".legacy-forecast-day")!)
            .backgroundColor,
          forecastDayBackgroundImage: getComputedStyle(
            document.querySelector(".legacy-forecast-day")!
          ).backgroundImage,
          forecastDayBorderRadius: getComputedStyle(document.querySelector(".legacy-forecast-day")!)
            .borderRadius,
          forecastDayCount: document.querySelectorAll(".legacy-forecast-day").length,
          forecastDayHeights: [...document.querySelectorAll(".legacy-forecast-day")].map((node) =>
            Math.round(node.getBoundingClientRect().height)
          ),
          firstForecastConnectorContent: getComputedStyle(
            document.querySelector(".legacy-forecast-day:first-child")!,
            "::before"
          ).content,
          imageryCard: rect(".imagery-card"),
          shell: rect(".popup-shell"),
          shellPaddingBottom: getComputedStyle(document.querySelector(".popup-shell")!)
            .paddingBottom,
          side: rect(".legacy-side-panel"),
          specialHidden: document.querySelector(".special-weather-card")?.hasAttribute("hidden"),
          special: rect(".special-weather-card"),
          sceneBackground: getComputedStyle(document.querySelector(".legacy-current")!, "::before")
            .backgroundImage,
          shellBackground: getComputedStyle(document.querySelector(".popup-shell")!)
            .backgroundColor,
          specialTitleBackground: getComputedStyle(
            document.querySelector(".special-weather-title")!
          ).backgroundColor,
          specialContent: rect(".special-weather-content"),
          specialContentDisplay: getComputedStyle(
            document.querySelector(".special-weather-content")!
          ).display,
          specialContentFontSize: parseFloat(
            getComputedStyle(document.querySelector(".special-weather-content")!).fontSize
          ),
          specialContentLineHeight: parseFloat(
            getComputedStyle(document.querySelector(".special-weather-content")!).lineHeight
          ),
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
          hasAppVersion: document.querySelector(".app-version") !== null,
          meta: rect(".legacy-meta"),
          hongKongTime: rect(".hong-kong-time"),
          hongKongTimeText:
            document.querySelector<HTMLElement>(".hong-kong-time")?.textContent?.trim() ?? "",
          timestamp: rect(".timestamp"),
          activeImageryTabText: activeTab?.textContent?.trim() ?? "",
          imageryPreviewHidden: document.querySelector(".imagery-preview")?.hasAttribute("hidden"),
          tropicalCyclone: optionalRect(".tropical-cyclone-view"),
          tropicalCycloneDescriptionFits: tcDescription
            ? tcDescription.scrollHeight <= tcDescription.clientHeight + 1
            : true,
          tropicalCycloneOptionTexts: [
            ...document.querySelectorAll<HTMLOptionElement>(".tropical-cyclone-select option")
          ].map((option) => option.textContent ?? ""),
          tropicalCycloneSelect: optionalRect(".tropical-cyclone-select"),
          tropicalCycloneTitleCount: document.querySelectorAll(".tropical-cyclone-name").length,
          tropicalCycloneTabVisible: tcTab ? !tcTab.hasAttribute("hidden") : false,
          tropicalCycloneTrack: optionalRect(".tropical-cyclone-track"),
          warning: rect(".warning-signal-row"),
          contentLeftPadding: Math.round(rect(".legacy-current").left - rect(".popup-shell").left),
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
      expect(layout.contentLeftPadding).toBe(12);
      expect(layout.shellPaddingBottom).toBe("7px");
      expect(layout.forecast.left).toBe(layout.current.left);
      expect(layout.meta.left).toBe(layout.current.left);
      expect(layout.forecast.bottom).toBeLessThanOrEqual(layout.shell.bottom - 12);
      expect(layout.warning.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
      expect(layout.side.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
      expect(Math.abs(layout.imageryCard.height - layout.current.height)).toBeLessThanOrEqual(6);
      expect(layout.titleTextScrollWidth).toBeLessThanOrEqual(layout.titleTextClientWidth + 1);
      expect(overlaps(layout.readings, layout.warning)).toBe(false);
      expect(layout.sceneBackground).toContain(`${scenario.scene ?? "rain"}.webp`);
      expect(layout.specialHidden).toBe(scenario.special === null);
      if (scenario.special !== null) {
        expect(layout.special.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
        expect(layout.special.right).toBeLessThanOrEqual(layout.side.left - 4);
        expect(overlaps(layout.readings, layout.special)).toBe(false);
        expect(overlaps(layout.special, layout.warning)).toBe(false);
        expect(overlaps(layout.currentTemp, layout.special)).toBe(false);
        expect(layout.specialContent.height).toBeGreaterThanOrEqual(46);
      }
      if (scenario.lang === "en" && scenario.special !== null) {
        expect(layout.specialContentDisplay).toBe("block");
        expect(layout.specialContentLineClamp).not.toBe("4");
        expect(layout.specialContentLineHeight).toBeGreaterThan(layout.specialContentFontSize + 1);
        expect(layout.titleTextOverflow).not.toBe("ellipsis");
      }
      if (scenario.tropicalCyclone === null || scenario.tropicalCyclone === undefined) {
        expect(layout.tropicalCyclone).toBeNull();
        expect(layout.tropicalCycloneTabVisible).toBe(false);
      } else {
        expect(layout.tropicalCyclone).not.toBeNull();
        expect(layout.tropicalCycloneTabVisible).toBe(true);
        expect(layout.activeImageryTabText).toContain("颱風");
        expect(layout.imageryPreviewHidden).toBe(true);
        if (!layout.tropicalCyclone) throw new Error("Missing tropical cyclone panel");
        expect(layout.tropicalCyclone.left).toBeGreaterThanOrEqual(layout.imageryCard.left);
        expect(layout.tropicalCyclone.right).toBeLessThanOrEqual(layout.imageryCard.right);
        expect(layout.tropicalCyclone.bottom).toBeLessThanOrEqual(layout.imageryCard.bottom);
        expect(layout.imageryCard.bottom).toBeLessThanOrEqual(layout.forecast.top - 8);
        expect(layout.tropicalCycloneDescriptionFits).toBe(true);
        expect(layout.tropicalCycloneTitleCount).toBe(0);
        expect(layout.tropicalCycloneTrack).not.toBeNull();
        if (!layout.tropicalCycloneTrack) throw new Error("Missing tropical cyclone track button");
        expect(layout.tropicalCycloneTrack.right).toBeLessThanOrEqual(layout.imageryCard.right);
        expect(layout.tropicalCycloneTrack.bottom).toBeLessThanOrEqual(layout.imageryCard.bottom);
        if (scenario.tropicalCycloneCount && scenario.tropicalCycloneCount > 1) {
          expect(layout.activeImageryTabText).toContain(String(scenario.tropicalCycloneCount));
          expect(layout.tropicalCycloneSelect).not.toBeNull();
          expect(layout.tropicalCycloneOptionTexts).toHaveLength(scenario.tropicalCycloneCount);
          expect(layout.tropicalCycloneOptionTexts).toContain("強烈熱帶風暴 米克拉");
        }
      }
      expect(layout.meta.top).toBeGreaterThanOrEqual(layout.forecast.bottom);
      expect(layout.meta.right).toBeLessThanOrEqual(layout.shell.right - 12);
      expect(layout.meta.bottom).toBeLessThanOrEqual(layout.shell.bottom - 4);
      expect(layout.hongKongTimeText).toMatch(/^(香港時間|香港时间|Hong Kong Time) \d{2}:\d{2}$/);
      expect(
        Math.abs(
          (layout.hongKongTime.left + layout.hongKongTime.right) / 2 -
            (layout.shell.left + layout.shell.right) / 2
        )
      ).toBeLessThanOrEqual(2);
      expect(overlaps(layout.hongKongTime, layout.timestamp)).toBe(false);
      expect(layout.forecastItemsInside).toBe(true);
      expect(layout.forecastDayCount).toBe(7);
      expect(new Set(layout.forecastDayHeights).size).toBe(1);
      expect(layout.forecastBackground).toBe("rgba(0, 0, 0, 0)");
      expect(layout.forecastBorderTopWidth).toBe("0px");
      expect(layout.forecastBorderBottomWidth).toBe("0px");
      expect(layout.forecastBoxShadow).toBe("none");
      expect(layout.forecastDayBackground).not.toBe("rgb(255, 255, 255)");
      expect(layout.forecastDayBackgroundImage).not.toBe("none");
      expect(layout.forecastDayBorderRadius).toBe("8px");
      expect(layout.firstForecastConnectorContent).toBe("none");
      expect(layout.specialTitleBackground).not.toBe("rgb(255, 228, 109)");
      expect(layout.signalItemsInside).toBe(true);
      expect(layout.signalIconCount).toBe(layout.signalCount);
      expect(layout.hasAppVersion).toBe(false);
    });
  }

  test("selects every active tropical cyclone from the dropdown", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({
        activePanel: "typhoon",
        warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
        special: null,
        tropicalCyclone: tropicalCycloneView("米克拉會在今明兩日橫過琉球群島一帶。", 3),
        tropicalCycloneCount: 3
      }),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.locator(".tropical-cyclone-select option")).toHaveText([
      "強烈熱帶風暴 米克拉",
      "熱帶風暴 海高斯",
      "熱帶低氣壓 無名"
    ]);
    await expect(page.locator(".tropical-cyclone-select")).toHaveValue("0");
    await page.locator(".tropical-cyclone-select").selectOption("1");
    await expect(page.locator(".tropical-cyclone-select option:checked")).toHaveText(
      "熱帶風暴 海高斯"
    );
    await expect(page.locator(".tropical-cyclone-distance")).toHaveText("香港以西北約 2460 公里");
    await page.locator(".tropical-cyclone-select").selectOption("2");
    await expect(page.locator(".tropical-cyclone-select option:checked")).toHaveText(
      "熱帶低氣壓 無名"
    );
    await page.locator(".tropical-cyclone-select").selectOption("1");
    await expect(page.locator(".tropical-cyclone-select option:checked")).toHaveText(
      "熱帶風暴 海高斯"
    );
  });

  test("defaults to radar while showing the tropical cyclone tab", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({
        warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
        special: null,
        tropicalCycloneCount: 2,
        tropicalCyclone: tropicalCycloneView("米克拉會在今明兩日橫過琉球群島一帶。")
      }),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.locator(".imagery-card")).toHaveAttribute("data-panel", "radar");
    await expect(page.locator(".imagery-tab[data-panel='radar']")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".imagery-tab[data-panel='typhoon']")).toHaveAttribute(
      "aria-selected",
      "false"
    );
    await expect(page.locator(".imagery-preview")).toBeVisible();
    await expect(page.locator(".tropical-cyclone-view")).toBeHidden();

    await page.locator(".imagery-tab[data-panel='typhoon']").click();
    await expect(page.locator(".imagery-card")).toHaveAttribute("data-panel", "typhoon");
    await expect(page.locator(".imagery-tab[data-panel='typhoon']")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".imagery-preview")).toBeHidden();
    await expect(page.locator(".tropical-cyclone-view")).toBeVisible();
  });

  test("opens the tropical cyclone track map inside the popup", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({
        activePanel: "typhoon",
        warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
        special: null,
        tropicalCyclone: tropicalCycloneView("米克拉會在今明兩日橫過琉球群島一帶。")
      }),
      { waitUntil: "domcontentloaded" }
    );

    const actions = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing fixture element: ${selector}`);
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top
        };
      };
      return {
        actions: rect(".tropical-cyclone-actions"),
        card: rect(".imagery-card"),
        externalIcon: rect(".external-link-icon"),
        trackLabel: rect(".typhoon-map-label"),
        trackLabelText:
          document.querySelector<HTMLElement>(".typhoon-map-label")?.textContent?.trim() ?? "",
        track: rect(".tropical-cyclone-track"),
        trackMap: rect(".tropical-cyclone-track-map")
      };
    });

    expect(actions.trackMap.right).toBeLessThanOrEqual(actions.track.left - 4);
    expect(actions.trackLabelText).toBe("詳情");
    expect(actions.externalIcon.left).toBeGreaterThan(actions.trackLabel.right);
    expect(actions.externalIcon.right).toBeLessThanOrEqual(actions.track.right - 6);
    expect(actions.actions.right).toBeLessThanOrEqual(actions.card.right);
    expect(actions.actions.bottom).toBeLessThanOrEqual(actions.card.bottom);

    await page.locator(".tropical-cyclone-track-map").evaluate((button, url) => {
      if (button instanceof HTMLElement) button.dataset.trackMapUrl = url;
    }, TRACK_MAP);
    await page.locator(".tropical-cyclone-track-map").click();
    await expect(page.locator(".typhoon-track-map-overlay")).toBeVisible();
    await expect(page.locator(".typhoon-track-map-image")).toHaveAttribute("src", TRACK_MAP);
    await expect
      .poll(() =>
        page.locator(".typhoon-track-map-image").evaluate((image) => {
          return image instanceof HTMLImageElement ? image.naturalHeight : 0;
        })
      )
      .toBeGreaterThan(0);
    await expect(page.locator(".typhoon-track-map-image")).toBeVisible();
    await expect(page.locator(".typhoon-track-map-message")).toBeHidden();

    const overlay = await page.evaluate(() => {
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
      const panel = document.querySelector(".typhoon-track-map-panel");
      const panelStyles = panel ? getComputedStyle(panel) : null;
      const overlay = document.querySelector(".typhoon-track-map-overlay");
      const overlayStyles = overlay ? getComputedStyle(overlay) : null;
      return {
        close: rect(".typhoon-track-map-close"),
        image: rect(".typhoon-track-map-image"),
        overlay: rect(".typhoon-track-map-overlay"),
        overlayOverflowY: overlayStyles?.overflowY ?? "",
        panel: rect(".typhoon-track-map-panel"),
        panelOverflowY: panelStyles?.overflowY ?? "",
        panelPaddingTop: panelStyles?.paddingTop ?? "",
        shell: rect(".popup-shell")
      };
    });

    expect(overlay.overlay.left).toBeGreaterThanOrEqual(overlay.shell.left);
    expect(overlay.overlay.top).toBeGreaterThanOrEqual(overlay.shell.top);
    expect(overlay.overlay.right).toBeLessThanOrEqual(overlay.shell.right);
    expect(overlay.overlay.bottom).toBeLessThanOrEqual(overlay.shell.bottom);
    expect(overlay.overlay.left).toBeLessThanOrEqual(overlay.shell.left + 2);
    expect(overlay.overlay.top).toBeLessThanOrEqual(overlay.shell.top + 2);
    expect(overlay.overlay.right).toBeGreaterThanOrEqual(overlay.shell.right - 2);
    expect(overlay.overlay.bottom).toBeGreaterThanOrEqual(overlay.shell.bottom - 2);
    expect(overlay.panelPaddingTop).toBe("0px");
    expect(overlay.overlayOverflowY).toBe("auto");
    expect(overlay.panelOverflowY).toBe("visible");
    expect(overlay.panel.width).toBeLessThan(overlay.overlay.width - 80);
    expect(Math.abs(overlay.panel.width - overlay.image.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(overlay.panel.height - overlay.image.height)).toBeLessThanOrEqual(2);
    expect(overlay.image.top).toBeLessThanOrEqual(overlay.overlay.top + 2);
    expect(overlay.image.right).toBeLessThanOrEqual(overlay.panel.right);
    expect(overlay.image.bottom).toBeLessThanOrEqual(overlay.panel.bottom);
    expect(overlay.close.bottom).toBeGreaterThan(overlay.image.top);

    await page.locator(".typhoon-track-map-close").click();
    await expect(page.locator(".typhoon-track-map-overlay")).toBeHidden();
  });

  test("keeps the tropical cyclone track map failure controls centered away from close", async ({
    page
  }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({
        activePanel: "typhoon",
        warnings: `<div class="warning-signal-empty">沒有警告信號</div>`,
        special: null,
        tropicalCyclone: tropicalCycloneView("米克拉會在今明兩日橫過琉球群島一帶。")
      }),
      { waitUntil: "domcontentloaded" }
    );

    await page.locator(".typhoon-track-map-overlay").evaluate((overlay) => {
      if (overlay instanceof HTMLElement) {
        overlay.hidden = false;
        overlay.classList.add("has-message");
      }
    });
    await page.locator(".typhoon-track-map-panel").evaluate((panel) => {
      if (panel instanceof HTMLElement) panel.classList.add("is-message");
    });
    await page.locator(".typhoon-track-map-image").evaluate((image) => {
      if (image instanceof HTMLImageElement) image.hidden = true;
    });
    await page.locator(".typhoon-track-map-message").evaluate((message) => {
      if (message instanceof HTMLElement) message.hidden = false;
    });
    await page.locator(".typhoon-track-map-fallback").evaluate((fallback) => {
      if (fallback instanceof HTMLElement) {
        fallback.textContent = "未能載入路徑圖";
      }
    });
    await page.locator(".typhoon-track-map-retry").evaluate((retry) => {
      if (retry instanceof HTMLElement) retry.hidden = false;
    });

    const failure = await page.evaluate(() => {
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
        close: rect(".typhoon-track-map-close"),
        fallback: rect(".typhoon-track-map-fallback"),
        overlay: rect(".typhoon-track-map-overlay"),
        panel: rect(".typhoon-track-map-panel"),
        retry: rect(".typhoon-track-map-retry")
      };
    });

    expect(overlaps(failure.fallback, failure.close)).toBe(false);
    expect(overlaps(failure.retry, failure.close)).toBe(false);
    expect(failure.fallback.top).toBeGreaterThan(failure.close.bottom + 12);
    expect(
      Math.abs(
        (failure.panel.left + failure.panel.right) / 2 -
          (failure.overlay.left + failure.overlay.right) / 2
      )
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        (failure.panel.top + failure.panel.bottom) / 2 -
          (failure.overlay.top + failure.overlay.bottom) / 2
      )
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        (failure.retry.left + failure.retry.right) / 2 -
          (failure.overlay.left + failure.overlay.right) / 2
      )
    ).toBeLessThanOrEqual(2);
  });

  test("keeps English imagery tabs clear of the snapshot stepper with tropical cyclones", async ({
    page
  }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({
        activePanel: "radar",
        lang: "en",
        readings: [
          ["Temperature", "28°"],
          ["Humidity", "87%"],
          ["UV Index", "0.4 <small>(low)</small>"]
        ],
        special: null,
        title: "Heavy Rain",
        tropicalCyclone: tropicalCycloneView("Mekkhala is moving across the Ryukyu Islands.", 2),
        tropicalCycloneCount: 2,
        warnings: `<div class="warning-signal-empty">No warning signals</div>`
      }),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.locator(".imagery-tab")).toHaveText(["Radar", "Lightning", "Cyclone 2"]);
    await expect(page.locator(".imagery-tab[data-panel='typhoon']")).toHaveAttribute(
      "title",
      "Tropical Cyclone 2"
    );

    const compact = await measureImageryTabs(page);
    expect(compact.tabs.right).toBeLessThanOrEqual(compact.stepper.left - 2);
    expect(compact.tabTextFits).toBe(true);
    expect(compact.scrollWidth).toBeLessThanOrEqual(compact.clientWidth);

    await page.locator(".imagery-card").evaluate((node) => node.classList.add("is-expanded"));

    const expanded = await measureImageryTabs(page);
    expect(expanded.tabs.right).toBeLessThanOrEqual(expanded.stepper.left - 2);
    expect(expanded.tabTextFits).toBe(true);
    expect(expanded.scrollWidth).toBeLessThanOrEqual(expanded.clientWidth);
  });

  test("expands radar widget into a larger map view", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );
    const compactControls = await page.evaluate(() => {
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
      const visible = (selector: string) =>
        [...document.querySelectorAll(selector)].filter((node) => {
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.width > 0 &&
            box.height > 0
          );
        }).length;
      return {
        caption: rect(".imagery-caption"),
        expandButton: rect(".imagery-expand"),
        preview: rect(".imagery-preview"),
        rangeGap: getComputedStyle(document.querySelector(".radar-ranges")!).gap,
        rangeWidget: rect(".radar-ranges"),
        rangeWidths: [...document.querySelectorAll(".radar-range")].map((node) =>
          Math.round(node.getBoundingClientRect().width)
        ),
        stepper: rect(".imagery-stepper"),
        tabs: rect(".imagery-tabs"),
        ranges: visible(".radar-range"),
        snapshots: visible(".imagery-snapshot")
      };
    });
    expect(compactControls.snapshots).toBe(0);
    expect(compactControls.ranges).toBe(3);
    await expect(page.locator(".imagery-expand")).toHaveText("放大");
    expect(Math.round(compactControls.caption.left - compactControls.preview.left)).toBe(16);
    expect(Math.round(compactControls.preview.bottom - compactControls.caption.bottom)).toBe(8);
    expect(compactControls.rangeWidget.right).toBeLessThanOrEqual(compactControls.preview.right);
    expect(compactControls.rangeWidget.bottom).toBeLessThanOrEqual(compactControls.preview.bottom);
    expect(compactControls.rangeWidget.left).toBeGreaterThanOrEqual(compactControls.preview.left);
    expect(Math.round(compactControls.preview.right - compactControls.rangeWidget.right)).toBe(16);
    expect(Math.round(compactControls.preview.bottom - compactControls.rangeWidget.bottom)).toBe(8);
    expect(
      Math.abs(compactControls.caption.bottom - compactControls.rangeWidget.bottom)
    ).toBeLessThanOrEqual(1);
    expect(compactControls.rangeWidget.width).toBeLessThanOrEqual(115);
    expect(compactControls.rangeGap).toBe("0px");
    expect(Math.max(...compactControls.rangeWidths)).toBeLessThanOrEqual(38);
    expect(overlaps(compactControls.caption, compactControls.rangeWidget)).toBe(false);
    expect(compactControls.expandButton.left).toBeGreaterThanOrEqual(compactControls.preview.left);
    expect(compactControls.expandButton.right).toBeLessThanOrEqual(compactControls.preview.right);
    expect(compactControls.expandButton.top).toBeGreaterThanOrEqual(compactControls.preview.top);
    expect(compactControls.expandButton.bottom).toBeLessThanOrEqual(compactControls.preview.bottom);
    expect(overlaps(compactControls.expandButton, compactControls.tabs)).toBe(false);
    expect(overlaps(compactControls.expandButton, compactControls.stepper)).toBe(false);
    expect(overlaps(compactControls.expandButton, compactControls.caption)).toBe(false);
    expect(overlaps(compactControls.expandButton, compactControls.rangeWidget)).toBe(false);
    expect(Math.abs(compactControls.stepper.top - compactControls.tabs.top)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(compactControls.stepper.bottom - compactControls.tabs.bottom)
    ).toBeLessThanOrEqual(1);

    const radarCrop = await page.locator(".imagery-preview").evaluate((preview) => {
      const image = preview.querySelector("img");
      if (!image) throw new Error("Missing imagery image");
      return {
        imageWidth: image.getBoundingClientRect().width,
        previewWidth: preview.getBoundingClientRect().width
      };
    });
    expect(radarCrop.imageWidth).toBeGreaterThan(radarCrop.previewWidth * 1.6);
    await expect(page.locator(".imagery-caption")).toHaveText("時間12:06");

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
        caption: rect(".imagery-caption"),
        preview: rect(".imagery-preview"),
        rangeGap: getComputedStyle(document.querySelector(".radar-ranges")!).gap,
        rangeWidget: rect(".radar-ranges"),
        rangeWidths: [...document.querySelectorAll(".radar-range")].map((node) =>
          Math.round(node.getBoundingClientRect().width)
        ),
        stepper: rect(".imagery-stepper"),
        tabs: rect(".imagery-tabs"),
        shell: rect(".popup-shell")
      };
    });
    const expandedControls = await page.evaluate(() => {
      const visible = (selector: string) =>
        [...document.querySelectorAll(selector)].filter((node) => {
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.width > 0 &&
            box.height > 0
          );
        }).length;
      return {
        ranges: visible(".radar-range"),
        snapshots: visible(".imagery-snapshot")
      };
    });

    expect(Math.round(layout.card.width)).toBeGreaterThanOrEqual(468);
    expect(Math.round(layout.preview.width)).toBeGreaterThanOrEqual(448);
    expect(Math.round(layout.preview.height)).toBeGreaterThanOrEqual(418);
    expect(layout.preview.width).toBeGreaterThan(compactControls.preview.width);
    expect(layout.preview.height).toBeGreaterThan(compactControls.preview.height);
    expect(layout.card.top).toBeGreaterThanOrEqual(layout.shell.top);
    expect(layout.card.left).toBeGreaterThanOrEqual(layout.shell.left);
    expect(layout.card.right).toBeLessThanOrEqual(layout.shell.right - 12);
    expect(layout.card.bottom).toBeLessThanOrEqual(layout.shell.bottom);
    expect(layout.caption.width).toBeLessThanOrEqual(132);
    expect(layout.caption.left).toBeGreaterThanOrEqual(layout.preview.left);
    expect(layout.caption.right).toBeLessThanOrEqual(layout.preview.right);
    expect(layout.caption.width).toBeLessThan(layout.preview.width * 0.55);
    expect(overlaps(layout.caption, layout.rangeWidget)).toBe(false);
    expect(Math.round(layout.preview.right - layout.rangeWidget.right)).toBeLessThanOrEqual(18);
    expect(Math.round(layout.preview.bottom - layout.rangeWidget.bottom)).toBeLessThanOrEqual(8);
    expect(Math.abs(layout.caption.bottom - layout.rangeWidget.bottom)).toBeLessThanOrEqual(1);
    expect(layout.rangeWidget.width).toBeLessThanOrEqual(115);
    expect(layout.rangeGap).toBe("0px");
    expect(Math.max(...layout.rangeWidths)).toBeLessThanOrEqual(38);
    expect(Math.abs(layout.stepper.top - layout.tabs.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.stepper.bottom - layout.tabs.bottom)).toBeLessThanOrEqual(1);
    expect(expandedControls.snapshots).toBe(0);
    expect(expandedControls.ranges).toBe(3);
  });

  test("uses preview click zones and explicit controls for imagery navigation", async ({
    page
  }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    const preview = page.locator(".imagery-preview");
    const previewBox = await preview.boundingBox();
    if (!previewBox) throw new Error("Missing imagery preview bounds");

    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
    await expect(page.locator(".imagery-stepper-button")).toHaveCount(0);

    await preview.click({
      position: {
        x: previewBox.width * 0.25,
        y: previewBox.height * 0.5
      }
    });
    await expect(page.locator(".imagery-position")).toHaveText("4 / 5");
    await expect(preview).toHaveClass(/is-stepping-left/);
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
    await expect(preview).not.toHaveClass(/is-stepping-left/, { timeout: 1000 });

    await preview.click({
      position: {
        x: previewBox.width * 0.75,
        y: previewBox.height * 0.5
      }
    });
    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
    await expect(preview).toHaveClass(/is-stepping-right/);
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
    await expect(preview).not.toHaveClass(/is-stepping-right/, { timeout: 1000 });

    await preview.focus();
    await expect(preview).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".imagery-position")).toHaveText("4 / 5");
    await expect(preview).toHaveClass(/is-stepping-left/);
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
    await expect(preview).not.toHaveClass(/is-stepping-left/, { timeout: 1000 });

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
    await expect(preview).toHaveClass(/is-stepping-right/);
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
    await expect(preview).not.toHaveClass(/is-stepping-right/, { timeout: 1000 });

    await page.keyboard.press("Enter");
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);
    await expect(page.locator(".imagery-toast")).toBeHidden();

    await page.keyboard.press("Enter");
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);

    await preview.dblclick({
      position: {
        x: previewBox.width * 0.5,
        y: previewBox.height * 0.5
      }
    });
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);
    await expect(page.locator(".imagery-toast")).toBeHidden();
    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
  });

  test("shows first-use imagery step arrows inside the preview without overlapping controls", async ({
    page
  }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.evaluate(() => {
      (window as unknown as { __imageryStepHintDismissed?: boolean }).__imageryStepHintDismissed =
        false;
    });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

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

      const leftArrow = document.querySelector(".imagery-step-hint-left");
      const rightArrow = document.querySelector(".imagery-step-hint-right");
      if (!leftArrow || !rightArrow) throw new Error("Missing imagery step hint arrows");

      return {
        caption: rect(".imagery-caption"),
        expandButton: rect(".imagery-expand"),
        forecast: rect(".legacy-forecast"),
        hint: rect(".imagery-step-hint"),
        leftArrow: rect(".imagery-step-hint-left"),
        preview: rect(".imagery-preview"),
        rangeWidget: rect(".radar-ranges"),
        rightArrow: rect(".imagery-step-hint-right"),
        stepper: rect(".imagery-stepper"),
        leftOpacity: Number(getComputedStyle(leftArrow).opacity),
        rightOpacity: Number(getComputedStyle(rightArrow).opacity)
      };
    });

    await expect(page.locator(".imagery-step-hint")).toBeVisible();
    expect(layout.hint.left).toBeGreaterThanOrEqual(layout.preview.left);
    expect(layout.hint.right).toBeLessThanOrEqual(layout.preview.right);
    expect(layout.hint.top).toBeGreaterThanOrEqual(layout.preview.top);
    expect(layout.hint.bottom).toBeLessThanOrEqual(layout.preview.bottom);
    expect(layout.leftArrow.left).toBeGreaterThanOrEqual(layout.preview.left);
    expect(layout.rightArrow.right).toBeLessThanOrEqual(layout.preview.right);
    expect(overlaps(layout.leftArrow, layout.stepper)).toBe(false);
    expect(overlaps(layout.rightArrow, layout.stepper)).toBe(false);
    expect(overlaps(layout.leftArrow, layout.expandButton)).toBe(false);
    expect(overlaps(layout.rightArrow, layout.expandButton)).toBe(false);
    expect(overlaps(layout.hint, layout.caption)).toBe(false);
    expect(overlaps(layout.hint, layout.rangeWidget)).toBe(false);
    expect(layout.hint.bottom).toBeLessThanOrEqual(layout.forecast.top);
    expect(layout.leftOpacity).toBeGreaterThan(0.8);
    expect(layout.rightOpacity).toBeLessThan(layout.leftOpacity);
  });

  test("keeps first-use imagery step arrows until a successful step then persists dismissal", async ({
    page
  }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.evaluate(() => {
      (window as unknown as { __imageryStepHintDismissed?: boolean }).__imageryStepHintDismissed =
        false;
    });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    const preview = page.locator(".imagery-preview");
    const previewBox = await preview.boundingBox();
    if (!previewBox) throw new Error("Missing imagery preview bounds");

    await expect(page.locator(".imagery-step-hint")).toBeVisible();
    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");

    await preview.click({
      position: {
        x: previewBox.width * 0.75,
        y: previewBox.height * 0.5
      }
    });
    await page.waitForTimeout(260);
    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
    await expect(page.locator(".imagery-step-hint")).toBeVisible();

    await preview.click({
      position: {
        x: previewBox.width * 0.25,
        y: previewBox.height * 0.5
      }
    });
    await expect(page.locator(".imagery-position")).toHaveText("4 / 5");
    await expect(page.locator(".imagery-step-hint")).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __imageryStepHintDismissed?: boolean })
              .__imageryStepHintDismissed === true
        )
      )
      .toBe(true);

    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );
    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
    await expect(page.locator(".imagery-step-hint")).toBeHidden();
  });

  test("plays imagery step feedback as a single pulse", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    const preview = page.locator(".imagery-preview");
    const initialOpacity = await preview.evaluate((node) => {
      return Number(getComputedStyle(node, "::after").opacity);
    });
    expect(initialOpacity).toBeLessThanOrEqual(0.1);

    await preview.evaluate((node) => node.classList.add("is-stepping-left"));

    await page.waitForTimeout(140);

    const pulseOpacity = await preview.evaluate((node) => {
      return Number(getComputedStyle(node, "::after").opacity);
    });
    expect(pulseOpacity).toBeGreaterThan(0.5);

    await page.waitForTimeout(250);

    const finishedOpacity = await preview.evaluate((node) => {
      return Number(getComputedStyle(node, "::after").opacity);
    });
    expect(finishedOpacity).toBeLessThanOrEqual(0.1);
  });

  test("shows an imagery expand hint toast when entering expanded view", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    const toast = page.locator(".imagery-toast");
    await expect(toast).toBeHidden();

    await page.locator(".imagery-expand").click();
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);
    await expect(toast).toBeVisible();
    await expect(toast).toHaveText("連按圖像放大");
    await expect(toast).not.toContainText(/[A-Za-z]/);
    await page.waitForTimeout(1700);
    await expect(toast).toBeHidden();

    await page.locator(".imagery-expand").click();
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
    await expect(toast).toBeHidden();
  });

  test("hides unavailable snapshot controls in expanded imagery fallback", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    await page.locator(".imagery-stepper").evaluate((node) => {
      node.setAttribute("hidden", "");
      node.querySelectorAll("button, span").forEach((child) => child.setAttribute("hidden", ""));
    });
    await page.locator(".radar-ranges").evaluate((node) => {
      node.setAttribute("hidden", "");
      node.replaceChildren();
    });
    await page.locator(".imagery-fallback").evaluate((node) => {
      node.removeAttribute("hidden");
      node.textContent = "未能載入";
    });
    await page.locator(".imagery-image-crop-map").evaluate((node) => {
      node.setAttribute("hidden", "");
    });

    await page.locator(".imagery-expand").click();

    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);
    await expect(page.locator(".imagery-stepper")).toBeHidden();
    await expect(page.locator(".radar-ranges")).toBeHidden();
    await expect(page.locator(".imagery-expand")).toHaveText("縮小");

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing fixture element: ${selector}`);
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top
        };
      };
      return {
        expandButton: rect(".imagery-expand"),
        fallback: rect(".imagery-fallback")
      };
    });
    expect(layout.expandButton.bottom).toBeLessThan(
      layout.fallback.top + (layout.fallback.bottom - layout.fallback.top) / 2 - 20
    );
  });

  test("collapses expanded imagery widget when clicking outside", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    await page.locator(".imagery-expand").click();
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);

    await page.locator(".radar-range").first().click();
    await expect(page.locator(".imagery-card")).toHaveClass(/is-expanded/);

    await page.locator(".legacy-forecast-day").first().click();
    await expect(page.locator(".imagery-card")).not.toHaveClass(/is-expanded/);
  });

  test("keeps snapshot position control compact without extra step buttons", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });
    await page.setContent(
      await fixtureHtml({ warnings: scenarios[0]?.warnings ?? "", special: "" }),
      {
        waitUntil: "domcontentloaded"
      }
    );

    await expect(page.locator(".imagery-position")).toHaveText("5 / 5");
    await expect(page.locator(".imagery-stepper-button")).toHaveCount(0);

    const stepperWidth = await page.locator(".imagery-stepper").evaluate((node) => {
      return Math.round(node.getBoundingClientRect().width);
    });
    expect(stepperWidth).toBeLessThanOrEqual(58);
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
    await page.locator(".imagery-preview img").evaluate((node) => {
      node.classList.add("imagery-image-lightning");
    });
    await page.locator(".radar-ranges").evaluate((node) => {
      node.style.setProperty("--range-count", "2");
      node.innerHTML =
        '<button class="radar-range">256km</button><button class="radar-range" aria-selected="true">64km</button>';
    });

    await expect(page.locator(".imagery-snapshot")).toHaveCount(0);
    await expect(page.locator(".radar-range")).toHaveText(["256km", "64km"]);
    await expect(page.locator(".radar-range", { hasText: "128km" })).toHaveCount(0);
    await expect(page.locator(".radar-range").filter({ visible: true })).toHaveCount(2);

    const gridColumnCount = await page.locator(".radar-ranges").evaluate((node) => {
      return getComputedStyle(node).gridTemplateColumns.split(" ").length;
    });
    expect(gridColumnCount).toBe(2);
    const compactLayout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing fixture element: ${selector}`);
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top
        };
      };
      return {
        caption: rect(".imagery-caption"),
        rangeWidget: rect(".radar-ranges")
      };
    });
    expect(overlaps(compactLayout.caption, compactLayout.rangeWidget)).toBe(false);

    const lightningCrop = await page.locator(".imagery-preview").evaluate((preview) => {
      const image = preview.querySelector("img");
      if (!image) throw new Error("Missing imagery image");
      return {
        imageWidth: image.getBoundingClientRect().width,
        previewWidth: preview.getBoundingClientRect().width
      };
    });
    expect(lightningCrop.imageWidth).toBeGreaterThan(lightningCrop.previewWidth * 1.6);
  });

  test("uses distinct weather scene backgrounds", async ({ page }) => {
    await page.setViewportSize({ width: 790, height: 438 });

    const sceneStyles = [];

    for (const scene of ["sunny", "rain", "storm"] as const) {
      await page.setContent(
        await fixtureHtml({
          scene,
          warnings: scenarios[0]?.warnings ?? "",
          special: ""
        }),
        { waitUntil: "domcontentloaded" }
      );

      const background = await page.locator(".legacy-current").evaluate((node) => {
        return getComputedStyle(node, "::before").backgroundImage;
      });
      expect(background).toContain(`${scene}.webp`);

      sceneStyles.push(
        await page.locator(".popup-shell").evaluate((node) => ({
          rangeBackground: getComputedStyle(document.querySelector(".radar-range[aria-selected]")!)
            .backgroundColor,
          shellBackground: getComputedStyle(node).backgroundColor,
          tabBackground: getComputedStyle(document.querySelector(".imagery-tab[aria-selected]")!)
            .backgroundColor
        }))
      );
    }

    expect(new Set(sceneStyles.map((style) => style.shellBackground)).size).toBe(3);
    expect(new Set(sceneStyles.map((style) => style.tabBackground)).size).toBe(3);
    expect(sceneStyles.every((style) => style.rangeBackground === style.tabBackground)).toBe(true);
  });
});

async function measureImageryTabs(page: Page) {
  return page.evaluate(() => {
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
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      stepper: rect(".imagery-stepper"),
      tabTextFits: [...document.querySelectorAll<HTMLElement>(".imagery-tab")].every(
        (tab) => tab.scrollWidth <= tab.clientWidth + 1
      ),
      tabs: rect(".imagery-tabs")
    };
  });
}

async function fixtureHtml({
  activePanel: requestedActivePanel,
  days: scenarioDays,
  lang = "zh-Hant",
  readings: scenarioReadings,
  scene = "rain",
  special,
  specialTitle = "特別天氣提示",
  title = "大雨",
  tropicalCycloneCount = 0,
  tropicalCyclone = null,
  warnings
}: LayoutScenario) {
  const css = await readFile(CSS_PATH, "utf8");
  const language = fixtureLanguage(lang);
  const hasTropicalCyclone = tropicalCyclone !== null && tropicalCyclone !== undefined;
  const activePanel = requestedActivePanel ?? "radar";
  const showTropicalCyclonePanel = hasTropicalCyclone && activePanel === "typhoon";
  const tropicalCyclonePanel = tropicalCyclone
    ? tropicalCyclone.replace(
        '<div class="tropical-cyclone-view"',
        `<div class="tropical-cyclone-view"${showTropicalCyclonePanel ? "" : " hidden"}`
      )
    : "";
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
        <main class="popup-shell legacy-weather" data-weather-scene="${scene}">
          <div class="window-notch" aria-hidden="true"></div>
          <div class="legacy-actions"><button class="legacy-icon-button">⚙</button><button class="legacy-icon-button">⟳</button></div>
          <section class="legacy-content" data-weather-scene="${scene}">
            <section class="legacy-current">
              <div class="current-title-row"><span class="weather-icon-frame"><img class="main-weather-icon" src="${ICON}" alt=""></span><span class="legacy-weather-title">${title}</span></div>
              <div class="legacy-readings">
                ${readings.map(([label, value], index) => `<div class="legacy-reading${index === 2 ? " legacy-reading-uv" : ""}"><span>${label}</span><strong>${value}</strong></div>`).join("")}
              </div>
              <div class="warning-signal-row">${warnings}</div>
              <button class="special-weather-card"${special === null ? " hidden" : ""}><div class="special-weather-title">${specialTitle}</div><div class="special-weather-content">${special ?? ""}</div></button>
            </section>
            <section class="legacy-side-panel">
              <div class="imagery-card" data-panel="${activePanel}"><div class="imagery-tabs"><button class="imagery-tab" data-panel="radar" aria-label="${sidePanelFullTitle("radar", language, tropicalCycloneCount)}" title="${sidePanelFullTitle("radar", language, tropicalCycloneCount)}" aria-selected="${activePanel === "radar" ? "true" : "false"}">${sidePanelTabTitle("radar", language, tropicalCycloneCount)}</button><button class="imagery-tab" data-panel="lightning" aria-label="${sidePanelFullTitle("lightning", language, tropicalCycloneCount)}" title="${sidePanelFullTitle("lightning", language, tropicalCycloneCount)}" aria-selected="${activePanel === "lightning" ? "true" : "false"}">${sidePanelTabTitle("lightning", language, tropicalCycloneCount)}</button><button class="imagery-tab" data-panel="typhoon" aria-label="${sidePanelFullTitle("typhoon", language, tropicalCycloneCount)}" title="${sidePanelFullTitle("typhoon", language, tropicalCycloneCount)}" aria-selected="${activePanel === "typhoon" ? "true" : "false"}"${hasTropicalCyclone ? "" : " hidden"}>${sidePanelTabTitle("typhoon", language, tropicalCycloneCount)}</button></div><div class="imagery-preview" role="button" tabindex="0" aria-label="天氣圖像預覽，按左右方向鍵轉圖，按 Enter 放大或縮小"${showTropicalCyclonePanel ? " hidden" : ""}><img class="imagery-image-crop-map" src="${RADAR}" alt=""><div class="imagery-stepper"><span class="imagery-position">5 / 5</span></div><button class="imagery-expand" type="button">放大</button><div class="imagery-step-hint" aria-hidden="true" hidden><span class="imagery-step-hint-arrow imagery-step-hint-left">‹</span><span class="imagery-step-hint-arrow imagery-step-hint-right">›</span></div><span class="imagery-fallback" hidden>Loading</span></div><div class="imagery-caption"${showTropicalCyclonePanel ? " hidden" : ""}><span>時間</span><span>12:06</span></div><div class="radar-ranges"${showTropicalCyclonePanel ? " hidden" : ""}><button class="radar-range">256km</button><button class="radar-range">128km</button><button class="radar-range" aria-selected="true">64km</button></div>${tropicalCyclonePanel}<div class="imagery-toast" role="status" aria-live="polite" hidden></div></div>
            </section>
            <section class="legacy-forecast">
              <div class="legacy-forecast-list">
                ${days.map(([date, temp]) => `<div class="legacy-forecast-day"><div class="legacy-forecast-date">${date}</div><img class="legacy-forecast-icon" src="${ICON}" alt=""><div class="legacy-forecast-temp">${temp}</div></div>`).join("")}
              </div>
            </section>
            <div class="legacy-meta"><span class="legacy-meta-status"></span><span class="hong-kong-time">香港時間 18:44</span><span class="timestamp">13:30 更新</span></div>
          </section>
          <div class="typhoon-track-map-overlay" role="dialog" aria-modal="true" aria-label="熱帶氣旋路徑圖" hidden>
            <div class="typhoon-track-map-panel">
              <button class="typhoon-track-map-close" type="button" aria-label="關閉路徑圖">關閉</button>
              <img class="typhoon-track-map-image" alt="熱帶氣旋路徑圖">
              <div class="typhoon-track-map-message" hidden>
                <span class="typhoon-track-map-fallback">未能載入路徑圖</span>
                <button class="typhoon-track-map-retry" type="button" hidden>重新載入</button>
              </div>
            </div>
          </div>
        </main>
        <script>
          const imageryCard = document.querySelector(".imagery-card");
          const imageryTabs = [...document.querySelectorAll(".imagery-tab")];
          const imageryPreview = document.querySelector(".imagery-preview");
          const imageryCaption = document.querySelector(".imagery-caption");
          const radarRanges = document.querySelector(".radar-ranges");
          const tropicalCycloneView = document.querySelector(".tropical-cyclone-view");
          const imageryPosition = document.querySelector(".imagery-position");
          const imageryStepper = document.querySelector(".imagery-stepper");
          const imageryExpand = document.querySelector(".imagery-expand");
          const imageryStepHint = document.querySelector(".imagery-step-hint");
          const imageryStepHintLeft = document.querySelector(".imagery-step-hint-left");
          const imageryStepHintRight = document.querySelector(".imagery-step-hint-right");
          const imageryToast = document.querySelector(".imagery-toast");
          const cycloneOptions = [...document.querySelectorAll(".tropical-cyclone-option")];
          const cycloneMeta = document.querySelector(".tropical-cyclone-meta");
          const cycloneDistance = document.querySelector(".tropical-cyclone-distance");
          const cycloneWind = document.querySelector(".tropical-cyclone-wind");
          const cycloneDescription = document.querySelector(".tropical-cyclone-description");
          const cycloneSelect = document.querySelector(".tropical-cyclone-select");
          const trackMapButton = document.querySelector(".tropical-cyclone-track-map");
          const trackMapOverlay = document.querySelector(".typhoon-track-map-overlay");
          const trackMapClose = document.querySelector(".typhoon-track-map-close");
          const trackMapImage = document.querySelector(".typhoon-track-map-image");
          const trackMapMessage = document.querySelector(".typhoon-track-map-message");
          const trackMapFallback = document.querySelector(".typhoon-track-map-fallback");
          const trackMapPanel = document.querySelector(".typhoon-track-map-panel");
          const trackMapRetry = document.querySelector(".typhoon-track-map-retry");
          const snapshotCount = 5;
          let selectedSnapshotIndex = snapshotCount - 1;
          let selectedCycloneIndex = 0;
          let previewClickTimer;
          let previewFeedbackTimer;
          let imageryToastTimer;
          let imageryStepHintDismissed = window.__imageryStepHintDismissed === true;
          const updateStepper = () => {
            if (imageryPosition) {
              imageryPosition.textContent = (selectedSnapshotIndex + 1) + " / " + snapshotCount;
            }
          };
          const renderImageryStepHint = () => {
            if (!(imageryStepHint instanceof HTMLElement)) return;
            const hasSnapshots = snapshotCount > 1;
            const controlsHidden = imageryPosition?.hidden || imageryStepper?.hidden;
            imageryStepHint.hidden = imageryStepHintDismissed || !hasSnapshots || Boolean(controlsHidden);
            imageryStepHintLeft?.classList.toggle("is-disabled", selectedSnapshotIndex <= 0);
            imageryStepHintRight?.classList.toggle("is-disabled", selectedSnapshotIndex >= snapshotCount - 1);
          };
          const renderCyclone = () => {
            const cyclone = cycloneOptions[selectedCycloneIndex];
            if (!(cyclone instanceof HTMLElement)) return;
            if (cycloneMeta) cycloneMeta.textContent = cyclone.dataset.meta || "";
            if (cycloneDistance) cycloneDistance.textContent = cyclone.dataset.distance || "";
            if (cycloneWind) cycloneWind.textContent = cyclone.dataset.wind || "";
            if (cycloneDescription) cycloneDescription.textContent = cyclone.dataset.description || "";
            if (cycloneSelect instanceof HTMLSelectElement) {
              cycloneSelect.value = String(selectedCycloneIndex);
            }
          };
          const selectCyclone = (value) => {
            if (cycloneOptions.length < 2) return;
            selectedCycloneIndex = Math.max(0, Math.min(cycloneOptions.length - 1, Number(value)));
            renderCyclone();
          };
          const selectPanel = (panel) => {
            const safePanel = panel === "typhoon" && !tropicalCycloneView ? "radar" : panel;
            if (imageryCard instanceof HTMLElement) imageryCard.dataset.panel = safePanel;
            imageryTabs.forEach((tab) => {
              if (tab instanceof HTMLElement) {
                tab.setAttribute("aria-selected", String(tab.dataset.panel === safePanel));
              }
            });
            const isTyphoon = safePanel === "typhoon";
            if (imageryPreview instanceof HTMLElement) imageryPreview.hidden = isTyphoon;
            if (imageryCaption instanceof HTMLElement) imageryCaption.hidden = isTyphoon;
            if (radarRanges instanceof HTMLElement) radarRanges.hidden = isTyphoon;
            if (tropicalCycloneView instanceof HTMLElement) tropicalCycloneView.hidden = !isTyphoon;
          };
          const setTrackMapMessageState = (state) => {
            const visible = state !== "hidden";
            trackMapOverlay?.classList.toggle("has-message", visible);
            trackMapPanel?.classList.toggle("is-message", visible);
            if (trackMapMessage instanceof HTMLElement) trackMapMessage.hidden = !visible;
            if (trackMapRetry instanceof HTMLElement) trackMapRetry.hidden = state !== "error";
            if (trackMapFallback instanceof HTMLElement) {
              trackMapFallback.textContent = state === "loading" ? "載入路徑圖中..." : "未能載入路徑圖";
            }
          };
          const showTrackMap = (forceReload = false) => {
            if (!(trackMapOverlay instanceof HTMLElement) || !(trackMapImage instanceof HTMLImageElement)) return;
            const url = trackMapButton instanceof HTMLElement ? trackMapButton.dataset.trackMapUrl || "" : "";
            trackMapOverlay.hidden = false;
            setTrackMapMessageState("loading");
            if (forceReload) trackMapImage.removeAttribute("src");
            if (url && (forceReload || trackMapImage.src !== url)) {
              trackMapImage.hidden = true;
              trackMapImage.src = url;
            }
            if (trackMapImage.complete && trackMapImage.naturalWidth > 0) {
              trackMapImage.hidden = false;
              setTrackMapMessageState("hidden");
            }
          };
          const hideTrackMap = () => {
            if (trackMapOverlay instanceof HTMLElement) trackMapOverlay.hidden = true;
          };
          const dismissImageryStepHint = () => {
            if (imageryStepHintDismissed) return;
            imageryStepHintDismissed = true;
            window.__imageryStepHintDismissed = true;
            renderImageryStepHint();
          };
          const stepSnapshot = (direction) => {
            const nextIndex = selectedSnapshotIndex + direction;
            if (nextIndex < 0 || nextIndex >= snapshotCount) return false;
            selectedSnapshotIndex = nextIndex;
            updateStepper();
            renderImageryStepHint();
            return true;
          };
          const clearPreviewClickTimer = () => {
            if (previewClickTimer === undefined) return;
            window.clearTimeout(previewClickTimer);
            previewClickTimer = undefined;
          };
          const clearImageryStepFeedback = () => {
            if (previewFeedbackTimer !== undefined) {
              window.clearTimeout(previewFeedbackTimer);
              previewFeedbackTimer = undefined;
            }
            imageryPreview?.classList.remove("is-stepping-left", "is-stepping-right");
          };
          const showImageryStepFeedback = (direction) => {
            clearImageryStepFeedback();
            imageryPreview?.classList.add(direction < 0 ? "is-stepping-left" : "is-stepping-right");
            previewFeedbackTimer = window.setTimeout(clearImageryStepFeedback, 360);
          };
          const renderImageryExpandButton = () => {
            if (imageryExpand) {
              imageryExpand.textContent = imageryCard?.classList.contains("is-expanded") ? "縮小" : "放大";
            }
          };
          const hideImageryToast = () => {
            if (imageryToastTimer !== undefined) {
              window.clearTimeout(imageryToastTimer);
              imageryToastTimer = undefined;
            }
            if (imageryToast instanceof HTMLElement) {
              imageryToast.hidden = true;
            }
          };
          const showImageryToast = () => {
            if (!(imageryToast instanceof HTMLElement)) return;
            if (imageryToastTimer !== undefined) {
              window.clearTimeout(imageryToastTimer);
              imageryToastTimer = undefined;
            }
            imageryToast.textContent = "連按圖像放大";
            imageryToast.hidden = false;
            imageryToastTimer = window.setTimeout(hideImageryToast, 1600);
          };
          const toggleImageryExpanded = (options = {}) => {
            const wasExpanded = Boolean(imageryCard?.classList.contains("is-expanded"));
            imageryCard?.classList.toggle("is-expanded");
            renderImageryExpandButton();
            if (!wasExpanded && imageryCard?.classList.contains("is-expanded") && options.showToast) {
              showImageryToast();
            } else {
              hideImageryToast();
            }
          };
          const shouldIgnorePreviewAction = (target) => {
            return target instanceof Element && Boolean(target.closest(".imagery-stepper, button"));
          };
          updateStepper();
          renderImageryStepHint();
          renderCyclone();
          cycloneSelect?.addEventListener("change", (event) => selectCyclone(event.target?.value));
          imageryTabs.forEach((tab) => {
            tab.addEventListener("click", () => selectPanel(tab instanceof HTMLElement ? tab.dataset.panel || "radar" : "radar"));
          });
          trackMapButton?.addEventListener("click", () => showTrackMap());
          trackMapClose?.addEventListener("click", hideTrackMap);
          trackMapRetry?.addEventListener("click", () => showTrackMap(true));
          trackMapImage?.addEventListener("load", () => {
            if (trackMapImage instanceof HTMLImageElement) trackMapImage.hidden = false;
            setTrackMapMessageState("hidden");
          });
          trackMapImage?.addEventListener("error", () => {
            if (trackMapImage instanceof HTMLImageElement) trackMapImage.hidden = true;
            setTrackMapMessageState("error");
          });
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
          imageryPreview?.addEventListener("click", (event) => {
            if (shouldIgnorePreviewAction(event.target)) return;
            const box = imageryPreview.getBoundingClientRect();
            const direction = event.clientX < box.left + box.width / 2 ? -1 : 1;
            clearPreviewClickTimer();
            previewClickTimer = window.setTimeout(() => {
              previewClickTimer = undefined;
              if (stepSnapshot(direction)) {
                dismissImageryStepHint();
                showImageryStepFeedback(direction);
              }
            }, 220);
          });
          imageryPreview?.addEventListener("dblclick", (event) => {
            if (shouldIgnorePreviewAction(event.target)) return;
            clearPreviewClickTimer();
            clearImageryStepFeedback();
            event.preventDefault();
            toggleImageryExpanded();
          });
          imageryPreview?.addEventListener("keydown", (event) => {
            if (shouldIgnorePreviewAction(event.target)) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              clearPreviewClickTimer();
              const direction = event.key === "ArrowLeft" ? -1 : 1;
              if (stepSnapshot(direction)) {
                dismissImageryStepHint();
                showImageryStepFeedback(direction);
              }
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              clearPreviewClickTimer();
              clearImageryStepFeedback();
              toggleImageryExpanded();
            }
          });
          imageryExpand?.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleImageryExpanded({ showToast: true });
          });
          document.addEventListener("click", (event) => {
            if (!imageryCard?.classList.contains("is-expanded")) return;
            if (event.target instanceof Node && imageryCard.contains(event.target)) return;
            imageryCard.classList.remove("is-expanded");
            hideImageryToast();
          }, { capture: true });
        </script>
      </body>
    </html>`;
}

function fixtureLanguage(lang: string): "tc" | "sc" | "en" {
  if (lang === "en") return "en";
  if (lang === "zh-Hans" || lang === "sc") return "sc";
  return "tc";
}
