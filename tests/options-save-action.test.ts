import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/weather-service";
import { optionsSaveAction } from "../src/options/save-action";

describe("options save action", () => {
  test("does not refresh weather for notification-only changes", () => {
    expect(
      optionsSaveAction(DEFAULT_SETTINGS, {
        ...DEFAULT_SETTINGS,
        notifyUpdated: !DEFAULT_SETTINGS.notifyUpdated
      })
    ).toBe("save-only");
  });

  test("does not refresh weather for notification category changes", () => {
    expect(
      optionsSaveAction(DEFAULT_SETTINGS, {
        ...DEFAULT_SETTINGS,
        notifyWarningCategories: ["rain-black"]
      })
    ).toBe("save-only");
  });

  test("updates the badge from cache for badge-only changes", () => {
    expect(
      optionsSaveAction(DEFAULT_SETTINGS, {
        ...DEFAULT_SETTINGS,
        badgeMode: "temperature"
      })
    ).toBe("update-badge");
  });

  test("refreshes weather when language changes", () => {
    expect(
      optionsSaveAction(DEFAULT_SETTINGS, {
        ...DEFAULT_SETTINGS,
        language: "en"
      })
    ).toBe("refresh-weather");
  });
});
