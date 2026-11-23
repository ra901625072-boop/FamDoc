import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = (localStorage.getItem('famdoc-theme-mode') ||
    localStorage.getItem('famdoc_theme') ||
    localStorage.getItem('famdoc-theme')) as ThemeMode | null;
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'light';
}

function resolveEffectiveTheme(mode: ThemeMode): Theme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  if (mode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyThemeToDOM(effectiveTheme: Theme, mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  localStorage.setItem('famdoc-theme-mode', mode);
  localStorage.setItem('famdoc_theme', effectiveTheme);
}

const initialMode = getStoredMode();
const initialTheme = resolveEffectiveTheme(initialMode);
applyThemeToDOM(initialTheme, initialMode);

// Setup system color scheme listener
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentMode = getStoredMode();
    if (currentMode === 'system') {
      const nextEffective = e.matches ? 'dark' : 'light';
      applyThemeToDOM(nextEffective, 'system');
      useThemeStore.setState({ theme: nextEffective });
    }
  });
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  theme: initialTheme,

  setMode: (mode: ThemeMode) => {
    const effective = resolveEffectiveTheme(mode);
    applyThemeToDOM(effective, mode);
    set({ mode, theme: effective });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    applyThemeToDOM(nextTheme, nextTheme);
    set({ mode: nextTheme, theme: nextTheme });
  },
}));
