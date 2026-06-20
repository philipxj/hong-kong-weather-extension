if (globalThis.location.protocol === "file:") {
  const loading = globalThis.document.getElementById("loading");
  if (loading) {
    loading.textContent = "不能直接用 file:// 開啟 popup；請用開發伺服器或載入擴充功能。";
  }
}
