import * as React from 'react';

export type FontSize = 'normal' | 'large' | 'extra-large';

export const FONT_SIZE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'extra-large', label: 'Muy grande' },
] as const;

function isFontSize(value: string | null | undefined): value is FontSize {
  return FONT_SIZE_OPTIONS.some((option) => option.value === value);
}

function currentFontSize(): FontSize {
  const value = document.documentElement.dataset.fontSize;
  return isFontSize(value) ? value : 'normal';
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = React.useState<FontSize>(currentFontSize);

  const setFontSize = React.useCallback((value: string) => {
    if (!isFontSize(value)) return;
    document.documentElement.dataset.fontSize = value;
    setFontSizeState(value);
    try {
      localStorage.setItem('jfm-font-size', value);
    } catch {
      // La preferencia sigue funcionando cuando el navegador bloquea el almacenamiento.
    }
  }, []);

  React.useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== 'jfm-font-size' && event.key !== null) return;
      const value = isFontSize(event.newValue) ? event.newValue : 'normal';
      document.documentElement.dataset.fontSize = value;
      setFontSizeState(value);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { fontSize, setFontSize };
}
