import { expect, test } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";

let server: ViteDevServer;
let popupUrl: string;

test.beforeAll(async () => {
  server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Missing popup server address");
  popupUrl = `http://127.0.0.1:${address.port}/popup/index.html`;
});

test.afterAll(async () => {
  await server?.close();
});

test.beforeEach(async ({ page }) => {
  const time = new Date("2026-10-03T01:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.route("https://www.hko.gov.hk/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="577" height="400"><rect width="577" height="400" fill="skyblue"/></svg>'
    })
  );
  await page.addInitScript(() => {
    const weather = {
      language: "tc",
      fetchedAt: new Date().toISOString(),
      stale: false,
      error: null,
      current: {
        temperature: 28,
        humidity: 80,
        uvIndex: 1,
        uvDesc: "低",
        rainfall: null,
        icon: 52,
        tips: [],
        warningMessages: [],
        forecast: "",
        warningSummary: ""
      },
      forecast: [],
      tropicalCyclones: [],
      warnings: [],
      warningInfo: []
    };
    const urls = ["range0", "range1", "range2"].flatMap((range) =>
      Array.from({ length: 5 }, (_, frame) => `${range}|test-${range}-${frame}.png`)
    );
    for (const [key, value] of Object.entries({
      weatherCache: weather,
      imageryUrlCache: {
        radar: { fetchedAt: Date.now(), url: urls.at(-1), urls },
        lightning: { fetchedAt: Date.now(), url: urls.at(-1), urls }
      }
    })) {
      localStorage.setItem(`hk-weather-alerts:local:${key}`, JSON.stringify(value));
    }
    Object.defineProperty(globalThis, "chrome", {
      value: {
        runtime: {
          getURL: (asset: string) => `/${asset}`,
          getManifest: () => ({ version: "test" }),
          sendMessage: () => Promise.resolve({ ok: true, data: weather })
        }
      }
    });
  });
});

for (const interaction of ["pointer", "Enter", "Space"] as const) {
  test(`restarts a selected radar range immediately with ${interaction}`, async ({ page }) => {
    await page.goto(popupUrl);
    await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
    const range = page.getByRole("button", { name: "128公里", exact: true });
    if (interaction === "pointer") await range.click();
    else {
      await range.focus();
      await page.keyboard.press(interaction);
    }
    await page.clock.runFor(1);
    await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
    await page.clock.runFor(800);
    await expect(page.locator("#imagery-position")).toHaveText("2 / 5");
  });
}

test("keeps explicit pause after selecting a radar range", async ({ page }) => {
  await page.goto(popupUrl);
  await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
  await page.getByRole("button", { name: "暫停雷達動畫", exact: true }).click();
  await page.getByRole("button", { name: "128公里", exact: true }).click();
  await page.clock.runFor(1);
  await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
  await page.clock.runFor(5000);
  await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
});

test("keeps reduced-motion playback stopped after selecting a radar range", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(popupUrl);
  await page.getByRole("button", { name: "128公里", exact: true }).click();
  await page.clock.runFor(1);
  await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
  await page.clock.runFor(5000);
  await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
});

test("waits until a slider drag finishes before starting the manual resume delay", async ({
  page
}) => {
  await page.goto(popupUrl);
  await expect(page.locator("#imagery-position")).toHaveText("1 / 5");
  const slider = await page.locator("#radar-playback-slider").boundingBox();
  if (!slider) throw new Error("Missing radar slider");
  await page.mouse.move(slider.x + 3, slider.y + slider.height / 2);
  await page.mouse.down();
  await page.mouse.move(slider.x + slider.width / 2, slider.y + slider.height / 2);
  await expect(page.locator("#imagery-position")).toHaveText("3 / 5");
  await page.clock.runFor(5000);
  await expect(page.locator("#imagery-position")).toHaveText("3 / 5");
  await page.mouse.up();
  await page.clock.runFor(3000);
  await expect(page.locator("#imagery-position")).toHaveText("3 / 5");
  await page.clock.runFor(800);
  await expect(page.locator("#imagery-position")).toHaveText("4 / 5");
});
