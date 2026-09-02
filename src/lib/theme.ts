/* Color mode management: persisted in localStorage, defaults to system preference. */

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'fd_theme';

export function getStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch (error) {
    console.warn('Failed to read theme from localStorage', error);
    return null;
  }
}

export function getSystemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getActiveTheme(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

/** Applies the mode by toggling the `dark` class on <html> (Tailwind class strategy). */
export function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn('Failed to persist theme', error);
  }
  applyTheme(theme);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getActiveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}