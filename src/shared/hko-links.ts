import type { Language } from "./types";

const HKO_ROOT = "https://www.hko.gov.hk";

const HKO_LANG_PATH: Record<Language, string> = {
  tc: "tc",
  sc: "sc",
  en: "en"
};

export function hkoPageUrl(language: Language, path: string): string {
  return `${HKO_ROOT}/${HKO_LANG_PATH[language]}/${path}`;
}
