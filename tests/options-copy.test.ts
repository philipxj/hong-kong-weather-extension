import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { optionsCopy } from "../src/options/options-copy";
import { ALL_NOTIFICATION_WARNING_CATEGORIES } from "../src/shared/weather-service";

const EXPECTED_BADGE_WARNING_CATEGORIES = [
  "rain-amber",
  "rain-red",
  "rain-black",
  "typhoon",
  "thunderstorm",
  "heat",
  "cold",
  "landslip",
  "flooding",
  "monsoon",
  "frost",
  "fire",
  "tsunami"
];

describe("options copy", () => {
  test("uses Chinese labels for Chinese language choices", () => {
    expect(optionsCopy("tc").traditionalChinese).toBe("繁體中文");
    expect(optionsCopy("tc").simplifiedChinese).toBe("簡體中文");
    expect(optionsCopy("en").traditionalChinese).toBe("繁體中文");
    expect(optionsCopy("en").simplifiedChinese).toBe("簡體中文");
  });

  test("localizes settings labels and save status", () => {
    expect(optionsCopy("tc").options).toBe("設定");
    expect(optionsCopy("tc").saveSettings).toBe("儲存設定");
    expect(optionsCopy("tc").appVersionLabel).toBe("版本");
    expect(optionsCopy("tc").githubRepository).toBe("GitHub");
    expect(optionsCopy("sc").options).toBe("设置");
    expect(optionsCopy("sc").saveSettings).toBe("保存设置");
    expect(optionsCopy("sc").appVersionLabel).toBe("版本");
    expect(optionsCopy("sc").githubRepository).toBe("GitHub");
    expect(optionsCopy("en").options).toBe("Options");
    expect(optionsCopy("en").saveSettings).toBe("Save settings");
    expect(optionsCopy("en").appVersionLabel).toBe("Version");
    expect(optionsCopy("en").githubRepository).toBe("GitHub");
  });

  test("explains what configurable options do", () => {
    expect(optionsCopy("tc").badgeModeDescription).toContain("警告");
    expect(optionsCopy("tc").warningIssuedDescription).toContain("新天氣警告");
    expect(optionsCopy("tc").notificationChangesOnlyDescription).toContain("狀態有變化");
    expect(optionsCopy("tc").testNotificationDescription).toContain("測試通知");
    expect(optionsCopy("tc").testNotificationCreatedNoPopup).toContain("Chrome 已建立通知");
    expect(optionsCopy("tc").currentRefreshMinutesDescription).toContain("隔多久");
    expect(optionsCopy("tc").currentRefreshMinutesDescription).toContain("氣溫");
    expect(optionsCopy("tc").currentRefreshMinutesDescription).toContain("濕度");
    expect(optionsCopy("tc").currentRefreshMinutesDescription).toContain("紫外線");
    expect(optionsCopy("tc").currentRefreshMinutesDescription).not.toContain("預報");
    expect(optionsCopy("sc").currentRefreshMinutesDescription).toContain("气温");
    expect(optionsCopy("sc").currentRefreshMinutesDescription).toContain("湿度");
    expect(optionsCopy("sc").currentRefreshMinutesDescription).toContain("紫外线");
    expect(optionsCopy("sc").currentRefreshMinutesDescription).not.toContain("预报");
    expect(optionsCopy("en").badgeModeDescription).toContain("highest warning");
    expect(optionsCopy("en").notificationChangesOnlyDescription).toContain("status changes");
    expect(optionsCopy("en").testNotification).toBe("Test notification");
    expect(optionsCopy("en").testNotificationCreatedNoPopup).toContain(
      "Chrome created the notification"
    );
    expect(optionsCopy("en").currentRefreshMinutesDescription).toContain("current temperature");
    expect(optionsCopy("en").currentRefreshMinutesDescription).toContain("humidity");
    expect(optionsCopy("en").currentRefreshMinutesDescription).toContain("UV index");
    expect(optionsCopy("en").currentRefreshMinutesDescription).not.toContain("forecast");
    expect(optionsCopy("en").warningCheckMinutesDescription).toContain("background service");
  });

  test("localizes notification warning category labels", () => {
    expect(optionsCopy("tc").notificationWarningCategories).toBe("通知警告種類");
    expect(optionsCopy("tc").notificationWarningCategoriesDescription).toContain("彈出視窗");
    expect(optionsCopy("tc").notificationWarningCategoriesDescription).not.toContain("popup");
    expect(optionsCopy("tc").notificationWarningCategoryRainAmber).toBe("黃雨");
    expect(optionsCopy("tc").notificationWarningCategoryRainRed).toBe("紅雨");
    expect(optionsCopy("tc").notificationWarningCategoryRainBlack).toBe("黑雨");
    expect(optionsCopy("tc").notificationWarningCategoryThunderstorm).toBe("雷暴");
    expect(optionsCopy("tc").notificationWarningCategoryOther).toBe("其他警告");
    expect(optionsCopy("sc").notificationWarningCategoriesDescription).toContain("弹出窗口");
    expect(optionsCopy("sc").notificationWarningCategoriesDescription).not.toContain("popup");
    expect(optionsCopy("sc").notificationWarningCategoryHeat).toBe("酷热");
    expect(optionsCopy("sc").notificationWarningCategoryFire).toBe("火灾危险");
    expect(optionsCopy("en").notificationWarningCategories).toBe("Warning types");
    expect(optionsCopy("en").notificationWarningCategoriesDescription).toContain("popup");
    expect(optionsCopy("en").notificationWarningCategoryRainAmber).toBe("Amber rainstorm");
    expect(optionsCopy("en").notificationWarningCategoryRainRed).toBe("Red rainstorm");
    expect(optionsCopy("en").notificationWarningCategoryRainBlack).toBe("Black rainstorm");
    expect(optionsCopy("en").notificationWarningCategoryTyphoon).toBe("Tropical cyclone");
    expect(optionsCopy("en").notificationWarningCategoryTsunami).toBe("Tsunami");
  });

  test("localizes toolbar badge warning category copy", () => {
    expect(optionsCopy("tc").badgeWarningCategories).toBe("徽章警告種類");
    expect(optionsCopy("tc").badgeWarningCategoriesDescription).toContain("工具列徽章");
    expect(optionsCopy("tc").badgeWarningCategoriesDescription).toContain("彈出視窗");
    expect(optionsCopy("tc").badgeWarningCategoryRainAmber).toBe("黃雨");
    expect(optionsCopy("tc").badgeWarningCategoryFire).toBe("火災危險");
    expect(optionsCopy("sc").badgeWarningCategoriesDescription).toContain("工具列徽章");
    expect(optionsCopy("sc").badgeWarningCategoryTsunami).toBe("海啸");
    expect(optionsCopy("en").badgeWarningCategories).toBe("Toolbar badge warning types");
    expect(optionsCopy("en").badgeWarningCategoriesDescription).toContain("toolbar badge");
    expect(optionsCopy("en").badgeWarningCategoryTyphoon).toBe("Tropical cyclone");
  });

  test("adds warning category checkboxes to the options form", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    for (const category of ALL_NOTIFICATION_WARNING_CATEGORIES) {
      expect(html).toContain('name="notifyWarningCategories"');
      expect(html).toContain(`value="${category}"`);
    }
  });

  test("adds toolbar badge warning category checkboxes to the display form", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    for (const category of EXPECTED_BADGE_WARNING_CATEGORIES) {
      expect(html).toContain('name="badgeWarningCategories"');
      expect(html).toContain(`value="${category}"`);
    }
    expect(html).not.toContain('name="badgeWarningCategories" value="other"');
  });

  test("wires warning category checkboxes into options form persistence", async () => {
    const script = await readFile(new URL("../src/options/main.ts", import.meta.url), "utf8");

    expect(script).toContain('input[name="notifyWarningCategories"]');
    expect(script).toContain("notifyWarningCategories");
  });

  test("wires toolbar badge warning category checkboxes into options form persistence", async () => {
    const script = await readFile(new URL("../src/options/main.ts", import.meta.url), "utf8");

    expect(script).toContain('input[name="badgeWarningCategories"]');
    expect(script).toContain("badgeWarningCategories");
  });

  test("marks the test notification button for localization", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    expect(html).toContain('id="test-notification"');
    expect(html).toContain('data-i18n="testNotification"');
  });

  test("keeps the test notification control hidden outside dev debug mode", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    const script = await readFile(new URL("../src/options/main.ts", import.meta.url), "utf8");

    expect(html).toContain('id="notification-test-row"');
    expect(html).toMatch(/id="notification-test-row"[^>]*hidden/);
    expect(script).toContain("import.meta.env.DEV");
  });

  test("uses compact tabs for language choices", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    expect(html).toContain('class="language-tabs"');
    expect(html).toContain('class="language-tab"');
    expect(html).not.toContain('data-i18n="traditionalChineseDescription"');
    expect(html).not.toContain('data-i18n="simplifiedChineseDescription"');
  });

  test("does not show the unused compact mode setting", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    expect(html).not.toContain('id="compactMode"');
    expect(html).not.toContain('data-i18n="compactMode"');
    expect(html).not.toContain('data-i18n="compactModeDescription"');
  });

  test("shows version and GitHub repository metadata in the about section", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    expect(html).toContain('data-i18n="appVersionLabel"');
    expect(html).toContain('id="app-version"');
    expect(html).toContain('data-i18n="githubRepository"');
    expect(html).toContain('href="https://github.com/philipxj/hong-kong-weather-extension"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });

  test("does not show the app version in the popup footer", async () => {
    const html = await readFile(new URL("../src/popup/index.html", import.meta.url), "utf8");
    expect(html).not.toContain('id="app-version"');
    expect(html).not.toContain('class="app-version"');
  });
});
