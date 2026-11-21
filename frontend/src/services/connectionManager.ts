import { create } from 'zustand';
import { resolveApiBaseUrl } from '../api/client';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'OFFLINE' | 'ERROR';

interface ConnectionState {
  status: ConnectionStatus;
  lastChecked: number | null;
  latencyMs: number | null;
  checkHealth: () => Promise<boolean>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'CONNECTING',
  lastChecked: null,
  latencyMs: null,

  checkHealth: async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ status: 'OFFLINE' });
      return false;
    }

    const start = performance.now();
    try {
      const baseUrl = resolveApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/health?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        set({ status: 'CONNECTED', lastChecked: Date.now(), latencyMs: latency });
        return true;
      } else {
        set({ status: 'ERROR', lastChecked: Date.now(), latencyMs: latency });
        return false;
      }
    } catch {
      set({ status: 'OFFLINE', lastChecked: Date.now() });
      return false;
    }
  },
}));

// Initialize window event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useConnectionStore.getState().checkHealth();
  });
  window.addEventListener('offline', () => {
    useConnectionStore.setState({ status: 'OFFLINE' });
  });

  // Initial check and periodic heartbeat every 45s
  setTimeout(() => {
    useConnectionStore.getState().checkHealth();
  }, 1000);

  setInterval(() => {
    useConnectionStore.getState().checkHealth();
  }, 45000);
}
