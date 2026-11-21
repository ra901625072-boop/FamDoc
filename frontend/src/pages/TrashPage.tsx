import { useTrashItems, useRestoreTrash, usePurgeTrash } from '../api/hooks';
import { api } from '../api/client';
import { Trash2, RotateCcw, AlertOctagon, FileText, Folder } from 'lucide-react';

export function TrashPage() {
  const { data: items = [], isLoading } = useTrashItems();
  const restoreMut = useRestoreTrash();
  const purgeMut = usePurgeTrash();

  const handleRestore = async (type: 'file' | 'folder', id: number, name: string) => {
    if (confirm(`Restore "${name}" back to vault?`)) {
      await restoreMut.mutateAsync({ itemType: type, itemId: id });
    }
  };

  const handlePurge = async (type: 'file' | 'folder', id: number, name: string) => {
    if (confirm(`Permanently delete "${name}"? This action CANNOT be undone.`)) {
      await purgeMut.mutateAsync({ itemType: type, itemId: id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-ink)]">Recycle Bin</h1>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1">
            Deleted items are held here safely before permanent removal.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-paper-tint)] text-[var(--text-ink)] border border-[var(--border-paper)]">
          {items.length} Items in Trash
        </span>
      </div>

      <div className="rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-ink-muted)]">Loading deleted items...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Trash2 className="w-12 h-12 text-[var(--border-paper)] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[var(--text-ink)]">Recycle bin is empty</h3>
            <p className="text-xs text-[var(--text-ink-muted)]">No files or folders have been deleted.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-paper)]">
            {items.map((item) => (
              <div key={`${item.item_type}-${item.id}`} className="flex items-center justify-between p-4 px-6 hover:bg-[var(--surface-paper-hover)] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                    {item.item_type === 'folder' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--text-ink)] truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-ink-muted)] mt-0.5">
                      Deleted: {api.helpers.formatDate(item.deleted_at)}
                      {item.size ? ` • ${api.helpers.formatBytes(item.size)}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(item.item_type, item.id, item.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-paper-tint)] hover:bg-[var(--surface-paper-hover)] text-emerald-600 text-xs font-semibold border border-[var(--border-paper)] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePurge(item.item_type, item.id, item.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-semibold border border-red-500/20 transition-colors"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Purge</span>
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
