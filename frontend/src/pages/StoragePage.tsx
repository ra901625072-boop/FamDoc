import { useState } from 'react';
import { useStorageConfig, useStorageAccounts, useUpdateStorageMode, useDeleteStorageAccount } from '../api/hooks';
import { api } from '../api/client';
import { Cloud, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export function StoragePage() {
  const { data: config, isLoading: configLoading } = useStorageConfig();
  const { data: accounts = [], isLoading: accountsLoading } = useStorageAccounts();
  const updateModeMut = useUpdateStorageMode();
  const deleteAccountMut = useDeleteStorageAccount();

  const [connecting, setConnecting] = useState(false);

  const totalBytes = config?.total_capacity_bytes ?? 15 * 1024 * 1024 * 1024; // 15GB default
  const usedBytes = config?.used_bytes ?? 0;
  const usedPct = totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;

  const handleConnectGoogleDrive = async () => {
    setConnecting(true);
    try {
      const res = await api.storage.getGoogleAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to initialize Google OAuth flow.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDeleteAccount = async (id: number, email: string) => {
    if (confirm(`Disconnect and remove Google Account "${email}" from the pooled vault?`)) {
      await deleteAccountMut.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-ink)]">Multi-Account Cloud Storage Pool</h1>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1">
            Aggregate free 15 GB Google Drive storage quotas into one seamless, encrypted family drive.
          </p>
        </div>
        <button
          type="button"
          onClick={handleConnectGoogleDrive}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{connecting ? 'Connecting...' : 'Connect Google Drive'}</span>
        </button>
      </div>

      {/* Aggregate Storage Capacity Bar */}
      <div className="p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-[var(--text-ink)]">Aggregated Pool Capacity</h2>
          </div>
          <span className="text-xs font-bold text-[var(--color-primary)]">
            {usedPct}% Used
          </span>
        </div>

        <div className="w-full h-3 bg-[var(--surface-paper-tint)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${usedPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-ink-muted)]">
          <span>Used: {configLoading ? '...' : api.helpers.formatBytes(usedBytes)}</span>
          <span>Total Pool: {configLoading ? '...' : api.helpers.formatBytes(totalBytes)}</span>
        </div>
      </div>

      {/* Storage Mode Selector */}
      <div className="p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-[var(--text-ink)]">Active Storage Engine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => updateModeMut.mutate('google_drive')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              config?.active_provider === 'google_drive' || !config?.active_provider
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/20 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-paper)] hover:border-[var(--color-primary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--text-ink)]">Google Drive Pooling (Default)</span>
              {(config?.active_provider === 'google_drive' || !config?.active_provider) && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-[11px] text-[var(--text-ink-muted)]">
              Multi-account chunking across connected Google accounts with zero server charges.
            </p>
          </div>

          <div
            onClick={() => updateModeMut.mutate('r2')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              config?.active_provider === 'r2'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]/20 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--border-paper)] hover:border-[var(--color-primary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--text-ink)]">Cloudflare R2 Direct</span>
              {config?.active_provider === 'r2' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] text-[var(--text-ink-muted)]">
              Zero egress fees and high-speed global CDN delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Connected Google Accounts List */}
      <div className="rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[var(--border-paper)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-ink)]">Connected Storage Accounts</h2>
          <span className="text-xs text-[var(--text-ink-muted)]">{accounts.length} Accounts Active</span>
        </div>

        {accountsLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-ink-muted)]">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-ink-muted)] space-y-2">
            <p>No external Google Drive accounts connected yet.</p>
            <button
              type="button"
              onClick={handleConnectGoogleDrive}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Connect your first Google account
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-paper)]">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-4 px-6 hover:bg-[var(--surface-paper-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-ink)]">{acc.account_email}</div>
                    <div className="text-[11px] text-[var(--text-ink-muted)] mt-0.5">
                      Used: {api.helpers.formatBytes(acc.storage_used_bytes)} / {api.helpers.formatBytes(acc.storage_limit_bytes)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id, acc.account_email)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Disconnect account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
