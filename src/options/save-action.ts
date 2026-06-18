import type { Settings } from "../shared/types";

export type OptionsSaveAction = "refresh-weather" | "update-badge" | "save-only";

export function optionsSaveAction(previous: Settings, next: Settings): OptionsSaveAction {
  if (previous.language !== next.language) return "refresh-weather";
  if (previous.badgeMode !== next.badgeMode) return "update-badge";
  return "save-only";
}
