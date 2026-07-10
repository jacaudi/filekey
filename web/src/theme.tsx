import { App as AntApp, ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark';

export const BRAND_PRIMARY = '#1377F9';
const STORAGE_KEY = 'fk_theme'; // parity with the old app's persistence key

// Single source of the app's antd theme. ThemeProvider spreads this and swaps only
// the algorithm by mode; Phase 4's a11y test imports it and reads/extends its token
// (e.g. controlHeightLG). Keep the token minimal — colorPrimary is the only brand
// override (design §4).
export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND_PRIMARY,
    controlHeightLG: 44, // ≥44px touch targets (design §6/§9)
  },
  algorithm: antdTheme.defaultAlgorithm,
};

function initialMode(): ThemeMode {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — fall through to system preference
  }
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ThemeContext = createContext<{ mode: ThemeMode; toggle(): void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next: ThemeMode = m === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // non-fatal: theme still flips for this session
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          ...appTheme,
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
