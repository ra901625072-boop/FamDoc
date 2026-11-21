import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { PublicShareInfo } from '../api/types';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Download, Lock, AlertTriangle, FileText, Clock } from 'lucide-react';

export function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PublicShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid link: No share token provided.');
      setLoading(false);
      return;
    }

    api.sharing
      .getPublicInfo(token)
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'This link is expired or invalid.');
        setLoading(false);
      });
  }, [token]);

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const blob = await api.sharing.downloadPublic(token, password || null);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = info?.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed. Incorrect password?');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-linen)]">
      <div className="w-full max-w-md bg-[var(--surface-card)] rounded-3xl p-8 border border-[var(--border-paper)] shadow-xl relative shared-layout">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        {/* Logo Header */}
        <div className="text-center mb-6 pb-4 border-b border-[var(--border-paper)]">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-1 no-underline">
            <img src="/img/logo.svg" alt="FamDoc Logo" className="w-8 h-8" />
            <span className="brand-text text-xl font-extrabold text-[var(--text-ink)]">
              Fam<span className="text-emerald-600 dark:text-emerald-400">Doc</span>
            </span>
          </Link>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-ink-muted)]">
            Family Keepsake Vault
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-8 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[var(--text-ink-muted)]">Retrieving shared document details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-ink)]">Shared Link Invalid</h3>
              <p className="text-xs text-[var(--text-ink-muted)] mt-1">{error}</p>
            </div>
            <Link
              to="/"
              className="inline-block px-4 py-2 rounded-xl bg-[var(--surface-paper-tint)] text-xs font-semibold text-[var(--text-ink)] no-underline hover:bg-[var(--surface-paper-hover)]"
            >
              Go to FamDoc Homepage
            </Link>
          </div>
        )}

        {/* Active Content State */}
        {!loading && !error && info && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface-paper-tint)]/60 border border-[var(--border-paper)]">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 text-emerald-600 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[var(--text-ink)] truncate" title={info.file_name}>
                  {info.file_name}
                </div>
                <div className="text-[10px] text-[var(--text-ink-muted)] mt-0.5">
                  {api.helpers.formatBytes(info.file_size)}
                </div>
              </div>
            </div>

            {info.expires_at && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-ink-muted)]">
                <Clock className="w-3.5 h-3.5" />
                <span>Link expires on: {api.helpers.formatDate(info.expires_at)}</span>
              </div>
            )}

            {info.has_password && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-ink)] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span>Password Protected</span>
                </div>
                <p className="text-[11px] text-[var(--text-ink-muted)]">
                  Enter the password set by the sender to download this file.
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                  className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-[var(--surface-card)] text-xs text-[var(--text-ink)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <button
              type="button"
              disabled={downloading || (info.has_password && !password)}
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Preparing download...' : 'Download File'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
