import { useThemeStore, type ThemeMode } from '../../stores/useThemeStore';

interface SegmentedThemeSelectorProps {
  idPrefix?: string;
  className?: string;
}

export function SegmentedThemeSelector({ idPrefix = 'sidebar', className = '' }: SegmentedThemeSelectorProps) {
  const { mode, setMode } = useThemeStore();

  const options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'system', label: 'Auto', icon: 'fas fa-magic' },
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
      {options.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          className={`fd-theme-option ${mode === opt.mode ? 'active' : ''}`}
          data-theme-mode={opt.mode}
          onClick={() => setMode(opt.mode)}
          aria-label={`${opt.label} theme`}
        >
          <i className={opt.icon} aria-hidden="true" />
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
