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
});
