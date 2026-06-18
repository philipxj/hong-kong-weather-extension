export default {
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  reporter: "list",
  use: {
    browserName: "chromium",
    viewport: { width: 790, height: 438 }
  }
};
