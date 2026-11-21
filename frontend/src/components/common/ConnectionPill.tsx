import { useConnectionStore } from '../../services/connectionManager';

export function ConnectionPill() {
  const { status, latencyMs } = useConnectionStore();

  const config = {
    CONNECTED: {
      color: 'bg-emerald-500',
      text: 'Connected',
      title: latencyMs ? `Latency: ${latencyMs}ms` : 'Connected to FamDoc Cloud',
    },
    CONNECTING: {
      color: 'bg-amber-500 animate-pulse',
      text: 'Connecting...',
      title: 'Establishing connection...',
    },
    OFFLINE: {
      color: 'bg-red-500',
      text: 'Offline',
      title: 'Offline mode active',
    },
    ERROR: {
      color: 'bg-red-500',
      text: 'Connection Error',
      title: 'Unable to reach backend',
    },
  }[status];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-paper-tint)] text-[var(--text-ink)] border border-[var(--border-paper)] shadow-xs"
      title={config.title}
    >
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="hidden sm:inline">{config.text}</span>
    </div>
  );
}
