import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`p-2 rounded-xl transition-all duration-200 hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink-muted)] hover:text-[var(--text-ink)] border border-transparent hover:border-[var(--border-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-[var(--color-primary)]" />
      )}
    </button>
  );
}
