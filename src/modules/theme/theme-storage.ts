export const themeStorageKey = "commandgrid.theme";

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

type ThemeMedia = Pick<MediaQueryList, "matches">;

export function parseTheme(value: string | null | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveInitialTheme(storage: ThemeStorage | undefined, media: ThemeMedia | undefined): Theme {
  try {
    const stored = parseTheme(storage?.getItem(themeStorageKey));
    if (stored) {
      return stored;
    }
  } catch {
    // Ignore storage access failures and fall back to system preference.
  }

  return media?.matches ? "dark" : "light";
}

export function persistTheme(storage: ThemeStorage | undefined, theme: Theme) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(themeStorageKey, theme);
  } catch {
    // Theme still changes in memory when persistence is unavailable.
  }
}
