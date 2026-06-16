import { getSettings, saveSettings, updateBadge } from "./shared/weather-service.js";

const form = document.querySelector("#options-form");
const status = document.querySelector("#save-status");

const settings = await getSettings();
hydrate(settings);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const next = readForm();
  await saveSettings(next);
  await updateBadge(null, next);
  status.textContent = "Saved";
  setTimeout(() => {
    status.textContent = "";
  }, 1800);
});

function hydrate(values) {
  form.querySelector(`input[name="language"][value="${values.language}"]`).checked = true;
  form.querySelector("#notifyIssued").checked = values.notifyIssued;
  form.querySelector("#notifyCancelled").checked = values.notifyCancelled;
  form.querySelector("#notifyExtended").checked = values.notifyExtended;
  form.querySelector("#notifyUpdated").checked = values.notifyUpdated;
  form.querySelector("#badgeMode").value = values.badgeMode;
  form.querySelector("#compactMode").checked = values.compactMode;
  form.querySelector("#currentRefreshMinutes").value = values.currentRefreshMinutes;
  form.querySelector("#warningCheckMinutes").value = values.warningCheckMinutes;
}

function readForm() {
  return {
    language: form.querySelector('input[name="language"]:checked')?.value || "tc",
    notifyIssued: form.querySelector("#notifyIssued").checked,
    notifyCancelled: form.querySelector("#notifyCancelled").checked,
    notifyExtended: form.querySelector("#notifyExtended").checked,
    notifyUpdated: form.querySelector("#notifyUpdated").checked,
    badgeMode: form.querySelector("#badgeMode").value,
    compactMode: form.querySelector("#compactMode").checked,
    currentRefreshMinutes: clampNumber(form.querySelector("#currentRefreshMinutes").value, 5, 180, 10),
    warningCheckMinutes: clampNumber(form.querySelector("#warningCheckMinutes").value, 3, 180, 5)
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
