import { motion } from 'motion/react';
import { useThemeStore, type ThemeMode } from '../../stores/useThemeStore';
import { springs } from '../../lib/motion';

interface SegmentedThemeSelectorProps {
  idPrefix?: string;
  className?: string;
}

export function SegmentedThemeSelector({ idPrefix = 'sidebar', className = '' }: SegmentedThemeSelectorProps) {
  const { mode, setMode } = useThemeStore();

  const options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'system', label: 'Auto', icon: 'fas fa-desktop' },
    { mode: 'light', label: 'Light', icon: 'fas fa-sun' },
    { mode: 'dark', label: 'Dark', icon: 'fas fa-moon' },
  ];

  return (
    <div
      className={`fd-theme-selector ${className}`}
      id={`${idPrefix}-theme-selector`}
      role="group"
      aria-label="Theme mode selector"
    >
      {options.map((opt) => {
        const isActive = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            className={`fd-theme-option ${isActive ? 'active' : ''}`}
            data-theme-mode={opt.mode}
            onClick={() => setMode(opt.mode)}
            aria-label={`${opt.label} theme`}
            style={{ position: 'relative' }}
          >
            {isActive && (
              <motion.div
                layoutId={`${idPrefix}-theme-indicator`}
                className="theme-active-indicator"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--radius-pill, 28px)',
                  backgroundColor: 'var(--surface-card)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  zIndex: 0,
                }}
                transition={springs.snappy}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className={opt.icon} aria-hidden="true" />
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
