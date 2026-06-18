import { getSettings, saveSettings, updateBadge } from "../shared/weather-service";
import type { Settings } from "../shared/types";

const form = query<HTMLFormElement>("#options-form");
const status = query<HTMLElement>("#save-status");

const settings = await getSettings();
hydrate(settings);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void save();
});

function hydrate(values: Settings): void {
  query<HTMLInputElement>(`input[name="language"][value="${values.language}"]`, form).checked =
    true;
  query<HTMLInputElement>("#notifyIssued", form).checked = values.notifyIssued;
  query<HTMLInputElement>("#notifyCancelled", form).checked = values.notifyCancelled;
  query<HTMLInputElement>("#notifyExtended", form).checked = values.notifyExtended;
  query<HTMLInputElement>("#notifyUpdated", form).checked = values.notifyUpdated;
  query<HTMLSelectElement>("#badgeMode", form).value = values.badgeMode;
  query<HTMLInputElement>("#currentRefreshMinutes", form).value = String(
    values.currentRefreshMinutes
  );
  query<HTMLInputElement>("#warningCheckMinutes", form).value = String(values.warningCheckMinutes);
}

function readForm(): Settings {
  return {
    language: query<HTMLInputElement>('input[name="language"]:checked', form)
      .value as Settings["language"],
    notifyIssued: query<HTMLInputElement>("#notifyIssued", form).checked,
    notifyCancelled: query<HTMLInputElement>("#notifyCancelled", form).checked,
    notifyExtended: query<HTMLInputElement>("#notifyExtended", form).checked,
    notifyUpdated: query<HTMLInputElement>("#notifyUpdated", form).checked,
    badgeMode: query<HTMLSelectElement>("#badgeMode", form).value as Settings["badgeMode"],
    currentRefreshMinutes: clampNumber(
      query<HTMLInputElement>("#currentRefreshMinutes", form).value,
      10,
      180,
      15
    ),
    warningCheckMinutes: clampNumber(
      query<HTMLInputElement>("#warningCheckMinutes", form).value,
      5,
      180,
      5
    )
  };
}

async function save(): Promise<void> {
  const next = readForm();
  await saveSettings(next);
  await updateBadge(null, next);
  status.textContent = "Saved";
  setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

function clampNumber(value: string, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function query<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}
