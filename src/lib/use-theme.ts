import * as React from 'react';

/**
 * Tema claro/oscuro.
 *
 * La fuente de verdad es el atributo `data-theme` en <html>, que el script de
 * `index.html` ya fijo antes del primer pintado. Este hook solo lo lee y lo
 * cambia; no hay estado duplicado que se pueda desincronizar del DOM.
 */

const STORAGE_KEY = 'jfm-theme';

export type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>(currentTheme);

  const setTheme = React.useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Modo privado o almacenamiento lleno: el tema vale para esta sesion.
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  // Mientras el usuario no elija explicitamente, el panel sigue al sistema.
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function handleChange(event: MediaQueryListEvent) {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {
        saved = null;
      }
      if (saved) return;

      const next: Theme = event.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setThemeState(next);
    }

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return { theme, setTheme, toggleTheme };
}
