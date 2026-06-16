import { getCachedWeather, getSettings, refreshWeather, updateBadge } from "./shared/weather-service.js";

const state = {
  data: null,
  settings: null,
  updating: false
};

const els = {
  loading: document.querySelector("#loading"),
  content: document.querySelector("#content"),
  updating: document.querySelector("#updating"),
  error: document.querySelector("#error"),
  cacheNote: document.querySelector("#cache-note"),
  lastUpdated: document.querySelector("#last-updated"),
  weatherIcon: document.querySelector("#weather-icon"),
  topTemp: document.querySelector("#top-temp"),
  topHumidity: document.querySelector("#top-humidity"),
  topUv: document.querySelector("#top-uv"),
  topRain: document.querySelector("#top-rain"),
  topSummary: document.querySelector("#top-summary"),
  cacheStatus: document.querySelector("#cache-status"),
  warningCount: document.querySelector("#warning-count"),
  warningRow: document.querySelector("#warning-row"),
  quickBulletin: document.querySelector("#quick-bulletin"),
  currentDetails: document.querySelector("#current-details"),
  forecastList: document.querySelector("#forecast-list"),
  warningList: document.querySelector("#warning-list")
};

document.querySelector("#refresh").addEventListener("click", () => load({ force: true }));
document.querySelector("#settings").addEventListener("click", openOptions);
document.querySelector("#open-options").addEventListener("click", openOptions);
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
});

await load();

async function load({ force = false } = {}) {
  state.settings = await getSettings();
  setUpdating(true);

  try {
    const cached = await getCachedWeather();
    if (cached && !force) {
      state.data = cached;
      render();
    }

    state.data = await refreshThroughBackground();
    render();
  } catch (error) {
    const cached = await getCachedWeather();
    if (cached) {
      state.data = {
        ...cached,
        stale: true,
        error: {
          message: error?.message || "Unable to update weather data."
        }
      };
      render();
    } else {
      renderFatalError(error);
    }
  } finally {
    setUpdating(false);
  }
}

async function refreshThroughBackground() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "refreshWeather" });
    if (response?.ok) return response.data;
    throw new Error(response?.error || "Refresh failed");
  } catch {
    const data = await refreshWeather(state.settings);
    await updateBadge(data, state.settings);
    return data;
  }
}

function render() {
  const data = state.data;
  if (!data) return;

  els.loading.hidden = true;
  els.content.hidden = false;
  els.error.hidden = !data.error;
  els.error.textContent = data.error
    ? `Update failed. Showing cached data. ${data.error.message || ""}`
    : "";
  els.cacheNote.textContent = data.stale ? "Cached data" : "";
  els.lastUpdated.textContent = `Last updated: ${formatDateTime(data.fetchedAt)}`;

  els.weatherIcon.textContent = data.current.icon ? `#${data.current.icon}` : "WX";
  els.topTemp.textContent = formatUnit(data.current.temperature, "°C");
  els.topHumidity.textContent = formatUnit(data.current.humidity, "%");
  els.topUv.textContent = data.current.uvIndex ?? "--";
  els.topRain.textContent = formatUnit(data.current.rainfall, "mm");
  els.cacheStatus.textContent = data.stale ? "Cached" : "Live";
  els.topSummary.textContent = data.current.forecast || data.current.summary || "Hong Kong local weather information";

  renderWarningChips(data.warnings);
  renderCurrent(data);
  renderForecast(data.forecast);
  renderWarnings(data);
}

function renderWarningChips(warnings) {
  els.warningRow.replaceChildren();
  els.warningCount.textContent = warnings.length ? `${warnings.length} active` : "";

  if (!warnings.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No active weather warnings / 現時沒有生效天氣警告";
    els.warningRow.append(empty);
    return;
  }

  warnings.forEach((warning) => {
    const chip = document.createElement("div");
    chip.className = `warning-chip warning-${warning.type}`;
    chip.innerHTML = `<span class="small-icon">${escapeHtml(warning.badge)}</span><span>${escapeHtml(warning.name)}</span><small>${escapeHtml(shortTime(warning.updateTime || warning.issueTime))}${warning.expireTime ? ` to ${escapeHtml(shortTime(warning.expireTime))}` : ""}</small>`;
    els.warningRow.append(chip);
  });
}

function renderCurrent(data) {
  const tips = data.current.tips.length ? data.current.tips.join("\n") : "--";
  renderQuickBulletin(data, tips);
  const rows = [
    ["Current temperature", formatUnit(data.current.temperature, "°C")],
    ["Humidity", formatUnit(data.current.humidity, "%")],
    ["UV index", [data.current.uvIndex ?? "--", data.current.uvDesc].filter(Boolean).join(" ")],
    ["Rainfall", formatUnit(data.current.rainfall, "mm")],
    ["Warning summary", data.current.warningSummary || "No active weather warnings"],
    ["Special weather tips", tips],
    ["Local weather forecast", data.current.forecast || "--"]
  ];
  els.currentDetails.replaceChildren(...rows.map(([label, value]) => kvRow(label, value)));
}

function renderQuickBulletin(data, tips) {
  const rows = [
    ["Warnings", data.current.warningSummary || "No active weather warnings"],
    ["Tips", tips],
    ["Forecast", data.current.forecast || "--"]
  ];

  els.quickBulletin.replaceChildren(...rows.map(([label, value]) => {
    const item = document.createElement("div");
    item.className = "bulletin-row";
    item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    return item;
  }));
}

function renderForecast(forecast) {
  els.forecastList.replaceChildren();
  if (!forecast.length) {
    els.forecastList.append(empty("No forecast data available."));
    return;
  }

  forecast.forEach((item) => {
    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
      <div><strong>${escapeHtml(formatDate(item.date))}</strong><br><span class="muted">${escapeHtml(item.weekday)}</span></div>
      <div class="small-icon">${item.icon ? `#${escapeHtml(String(item.icon))}` : "WX"}</div>
      <div>${formatUnit(item.minTemp, "°")} / ${formatUnit(item.maxTemp, "°")}</div>
      <div class="muted">${escapeHtml(item.humidity || "--")}</div>
      <div>${escapeHtml(item.text || "--")}${item.wind ? `<br><span class="muted">${escapeHtml(item.wind)}</span>` : ""}</div>
    `;
    els.forecastList.append(row);
  });
}

function renderWarnings(data) {
  els.warningList.replaceChildren();
  if (!data.warnings.length) {
    els.warningList.append(empty("No active weather warnings / 現時沒有生效天氣警告"));
    return;
  }

  data.warnings.forEach((warning) => {
    const details = document.createElement("div");
    details.className = "kv-list";
    details.innerHTML = `
      <div class="warning-chip warning-${warning.type}">${escapeHtml(warning.badge)} ${escapeHtml(warning.name)}</div>
      ${kvHtml("Issue time", formatDateTime(warning.issueTime))}
      ${kvHtml("Update time", formatDateTime(warning.updateTime))}
      ${warning.expireTime ? kvHtml("Expiry time", formatDateTime(warning.expireTime)) : ""}
      ${warning.contents ? kvHtml("Details", `<span class="block-text">${escapeHtml(warning.contents)}</span>`) : ""}
    `;
    els.warningList.append(details);
  });
}

function renderFatalError(error) {
  els.loading.hidden = true;
  els.content.hidden = true;
  els.error.hidden = false;
  els.error.textContent = `Unable to load weather data and no cache is available. ${error?.message || ""}`;
}

function selectTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.tab === name));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `tab-${name}`;
  });
}

function setUpdating(value) {
  state.updating = value;
  els.updating.hidden = !value;
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function kvRow(label, value) {
  const row = document.createElement("div");
  row.className = "kv-row";
  row.innerHTML = `<div class="label">${escapeHtml(label)}</div><div class="block-text">${escapeHtml(value || "--")}</div>`;
  return row;
}

function kvHtml(label, value) {
  return `<div class="kv-row"><div class="label">${escapeHtml(label)}</div><div>${value || "--"}</div></div>`;
}

function empty(message) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}

function formatUnit(value, unit) {
  return value == null || value === "" ? "--" : `${value}${unit}`;
}

function formatDate(value) {
  if (!value) return "--";
  if (/^\d{8}$/.test(value)) return `${value.slice(4, 6)}/${value.slice(6, 8)}`;
  return value;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function shortTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
