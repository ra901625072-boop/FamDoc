import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadService, type UploadQueueItem } from '../../services/uploadManager';
import { api } from '../../api/client';
import { springs, durations, easings } from '../../lib/motion';

export function UploadCard() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    return uploadService.subscribe((items) => setQueue(items));
  }, []);

  const activeCount = queue.filter((i) => i.status === 'uploading' || i.status === 'pending').length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;
  const totalCount = queue.length;

  return (
    <AnimatePresence>
      {queue.length > 0 && (
        <motion.div
          id="famdoc-upload-card"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={springs.gentle}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xl backdrop-blur-md overflow-hidden"
        >
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-between p-3.5 px-4 cursor-pointer select-none border-b border-[var(--border-paper)] bg-[var(--surface-paper-tint)]/50 hover:bg-[var(--surface-paper-hover)] transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-ink)]">
              {activeCount > 0 ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
              ) : failedCount > 0 ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={springs.snappy}
                >
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={springs.success}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </motion.div>
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
              className="text-[var(--text-ink-muted)] hover:text-[var(--text-ink)] transition-transform duration-200"
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: durations.fast, ease: easings.easeOut }}
                className="max-h-60 overflow-y-auto p-3 divide-y divide-[var(--border-paper)]/50"
              >
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
                      <motion.div
                        className={`h-full rounded-full ${
                          item.status === 'completed'
                            ? 'bg-emerald-500'
                            : item.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-[var(--color-primary)]'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: durations.fast, ease: easings.easeOut }}
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
                          className="hover:text-red-500 flex items-center gap-0.5 transition-colors"
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
