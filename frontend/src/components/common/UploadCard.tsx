import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { uploadService, type UploadQueueItem } from '../../services/uploadManager';
import { api } from '../../api/client';

export function UploadCard() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    return uploadService.subscribe((items) => setQueue(items));
  }, []);

  if (queue.length === 0) return null;

  const activeCount = queue.filter((i) => i.status === 'uploading' || i.status === 'pending').length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;
  const totalCount = queue.length;

  return (
    <div
      id="famdoc-upload-card"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300"
    >
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between p-3.5 px-4 cursor-pointer select-none border-b border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/50 hover:bg-[var(--surface-paper-hover)] transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-ink)]">
          {activeCount > 0 ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
          ) : failedCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
          <span>
            {activeCount > 0
              ? `Uploading ${completedCount + 1}/${totalCount}...`
              : failedCount > 0
              ? 'Uploads completed with errors'
              : 'All uploads completed'}
          </span>
        </div>
        <button
          type="button"
          aria-label={isCollapsed ? 'Expand uploads' : 'Collapse uploads'}
          className="text-[var(--text-ink-muted)] hover:text-[var(--text-ink)]"
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="max-h-60 overflow-y-auto p-3 divide-y divide-[var(--border-paper)]/50">
          {queue.map((item) => (
            <div key={item.id} className="py-2.5 first:pt-1 last:pb-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[var(--text-ink)] truncate max-w-[180px]" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[var(--text-ink-muted)]">
                  {item.status === 'completed'
                    ? 'Done'
                    : item.status === 'failed'
                    ? 'Error'
                    : `${item.progress}%`}
                </span>
              </div>
              <div className="w-full bg-[var(--surface-paper-tint)] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    item.status === 'completed'
                      ? 'bg-emerald-500'
                      : item.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-[var(--color-primary)]'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--text-ink-muted)]">
                <span>{api.helpers.formatBytes(item.size)}</span>
                {item.status === 'pending' || item.status === 'uploading' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      uploadService.cancelUpload(item.id);
                    }}
                    className="hover:text-red-500 flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {activeCount === 0 && (
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => uploadService.clearCompleted()}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Clear finished
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
