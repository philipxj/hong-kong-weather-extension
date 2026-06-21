import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_PATH = path.join(ROOT, "src", "shared", "ui.css");
const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect width='50' height='50' fill='%2384d8ff'/%3E%3Ccircle cx='18' cy='20' r='13' fill='%23ff7c00'/%3E%3Cellipse cx='34' cy='29' rx='18' ry='11' fill='%238b7cff'/%3E%3Cpath d='M16 36l-5 12M27 36l-5 12M38 36l-5 12' stroke='%23fff' stroke-width='3'/%3E%3C/svg%3E";
const RADAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='577' height='400'%3E%3Crect width='577' height='400' fill='%2359c7df'/%3E%3Cpath d='M0 70 C90 20 190 120 280 70 S470 10 577 85' stroke='%2327bf45' stroke-width='45' fill='none'/%3E%3Cpath d='M20 210 C130 130 235 250 330 180 S470 160 560 230' stroke='%23fff000' stroke-width='26' fill='none'/%3E%3Cpath d='M0 330 C110 270 210 370 330 300 S480 260 577 340' stroke='%23269bd8' stroke-width='55' fill='none'/%3E%3C/svg%3E";

interface Rect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface LayoutScenario {
  days?: [string, string][];
  lang?: string;
  readings?: [string, string][];
  scene?: string;
  warnings: string;
  special: string | null;
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
  }
];

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
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
          timestamp: rect(".timestamp"),
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
      expect(layout.meta.top).toBeGreaterThanOrEqual(layout.forecast.bottom);
      expect(layout.meta.right).toBeLessThanOrEqual(layout.shell.right - 12);
      expect(layout.meta.bottom).toBeLessThanOrEqual(layout.shell.bottom - 4);
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
    expect(Math.abs(compactControls.caption.bottom - compactControls.rangeWidget.bottom)).toBeLessThanOrEqual(
      1
    );
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

  test("uses preview click zones and explicit controls for imagery navigation", async ({ page }) => {
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

async function fixtureHtml({
  days: scenarioDays,
  lang = "zh-Hant",
  readings: scenarioReadings,
  scene = "rain",
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
              <div class="imagery-card"><div class="imagery-tabs"><button class="imagery-tab" aria-selected="true">雷達</button><button class="imagery-tab">閃電</button></div><div class="imagery-preview" role="button" tabindex="0" aria-label="天氣圖像預覽，按左右方向鍵轉圖，按 Enter 放大或縮小"><img class="imagery-image-crop-map" src="${RADAR}" alt=""><div class="imagery-stepper"><span class="imagery-position">5 / 5</span></div><button class="imagery-expand" type="button">放大</button><span class="imagery-fallback" hidden>Loading</span></div><div class="imagery-caption"><span>時間</span><span>12:06</span></div><div class="radar-ranges"><button class="radar-range">256km</button><button class="radar-range">128km</button><button class="radar-range" aria-selected="true">64km</button></div><div class="imagery-toast" role="status" aria-live="polite" hidden></div></div>
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
          const imageryPosition = document.querySelector(".imagery-position");
          const imageryExpand = document.querySelector(".imagery-expand");
          const imageryToast = document.querySelector(".imagery-toast");
          const snapshotCount = 5;
          let selectedSnapshotIndex = snapshotCount - 1;
          let previewClickTimer;
          let previewFeedbackTimer;
          let imageryToastTimer;
          const updateStepper = () => {
            if (imageryPosition) {
              imageryPosition.textContent = (selectedSnapshotIndex + 1) + " / " + snapshotCount;
            }
          };
          const stepSnapshot = (direction) => {
            const nextIndex = selectedSnapshotIndex + direction;
            if (nextIndex < 0 || nextIndex >= snapshotCount) return false;
            selectedSnapshotIndex = nextIndex;
            updateStepper();
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
