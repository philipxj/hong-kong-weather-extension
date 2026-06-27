import type { Settings } from "../shared/types";

export type OptionsSaveAction = "refresh-weather" | "update-badge" | "save-only";

export function optionsSaveAction(previous: Settings, next: Settings): OptionsSaveAction {
  if (previous.language !== next.language) return "refresh-weather";
  if (
    previous.badgeMode !== next.badgeMode ||
    !sameItems(previous.badgeWarningCategories, next.badgeWarningCategories)
  ) {
    return "update-badge";
  }
  return "save-only";
}

function sameItems(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false;
  return first.every((item, index) => item === second[index]);
}
