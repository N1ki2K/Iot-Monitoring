import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeContext, type ThemeMode } from './useTheme';

const THEME_STORAGE_KEY = 'appTheme';

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
      root.dataset.theme = theme;
      document.body.style.colorScheme = theme;
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
