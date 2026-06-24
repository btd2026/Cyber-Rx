export type Theme = 'light' | 'dark'

const KEY = 'cyberrx-theme'

/** Warm light is the default (brief §1). */
export function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export function persistTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
