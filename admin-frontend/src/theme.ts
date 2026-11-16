export type Theme = 'light' | 'dark';

const THEME_KEY = 'signage.admin.theme';

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** The theme in effect: the user's explicit choice, otherwise the OS setting. */
export function currentTheme(): Theme {
  return (
    storedTheme() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

/** Applies a stored choice (if any) before first paint; with none, CSS follows the OS. */
export function initTheme() {
  const stored = storedTheme();
  if (stored) document.documentElement.dataset.theme = stored;
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable (private mode): the choice just won't persist.
  }
}
