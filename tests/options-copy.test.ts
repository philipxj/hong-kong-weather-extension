import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { optionsCopy } from "../src/options/options-copy";

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
    expect(optionsCopy("sc").options).toBe("设置");
    expect(optionsCopy("sc").saveSettings).toBe("保存设置");
    expect(optionsCopy("en").options).toBe("Options");
    expect(optionsCopy("en").saveSettings).toBe("Save settings");
  });

  test("explains what configurable options do", () => {
    expect(optionsCopy("tc").badgeModeDescription).toContain("警告");
    expect(optionsCopy("tc").warningIssuedDescription).toContain("新天氣警告");
    expect(optionsCopy("tc").notificationChangesOnlyDescription).toContain("狀態有變化");
    expect(optionsCopy("tc").testNotificationDescription).toContain("測試通知");
    expect(optionsCopy("tc").currentRefreshMinutesDescription).toContain("隔多久");
    expect(optionsCopy("en").badgeModeDescription).toContain("highest warning");
    expect(optionsCopy("en").notificationChangesOnlyDescription).toContain("status changes");
    expect(optionsCopy("en").testNotification).toBe("Test notification");
    expect(optionsCopy("en").warningCheckMinutesDescription).toContain("background service");
  });

  test("marks the test notification button for localization", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");
    expect(html).toContain('id="test-notification"');
    expect(html).toContain('data-i18n="testNotification"');
  });
});
