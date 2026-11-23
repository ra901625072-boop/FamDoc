import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeStore } from '../../stores/useThemeStore';
import { springs } from '../../lib/motion';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <motion.button
      type="button"
      id="theme-toggle"
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`p-2 rounded-xl transition-colors duration-200 hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink-muted)] hover:text-[var(--text-ink)] border border-transparent hover:border-[var(--border-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] relative overflow-hidden ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ rotate: -40, scale: 0.75, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 40, scale: 0.75, opacity: 0 }}
            transition={springs.snappy}
          >
            <Sun className="w-5 h-5 text-amber-400" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 40, scale: 0.75, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -40, scale: 0.75, opacity: 0 }}
            transition={springs.snappy}
          >
            <Moon className="w-5 h-5 text-[var(--color-primary)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
