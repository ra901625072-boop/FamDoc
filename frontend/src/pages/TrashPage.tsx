import { useState } from 'react';
import { useTrashItems, useRestoreTrash, usePurgeTrash, useCurrentUser } from '../api/hooks';
import { api } from '../api/client';

export function TrashPage() {
  const { data: user } = useCurrentUser();
  const { data: items = [], isLoading } = useTrashItems();
  const restoreMut = useRestoreTrash();
  const purgeMut = usePurgeTrash();

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const isAdmin = user?.role === 'admin';

  const handleToggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isAllSelected = items.length > 0 && selectedKeys.length === items.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(items.map((i) => `${i.item_type}-${i.id}`));
    }
  };

  const handleClearSelection = () => {
    setSelectedKeys([]);
  };

  const handleRestore = async (type: 'file' | 'folder', id: number, name: string) => {
    if (confirm(`Restore "${name}" back to vault?`)) {
      await restoreMut.mutateAsync({ itemType: type, itemId: id });
      setSelectedKeys((prev) => prev.filter((k) => k !== `${type}-${id}`));
    }
  };

  const handlePurge = async (type: 'file' | 'folder', id: number, name: string) => {
    if (confirm(`Permanently delete "${name}"? This action CANNOT be undone.`)) {
      await purgeMut.mutateAsync({ itemType: type, itemId: id });
      setSelectedKeys((prev) => prev.filter((k) => k !== `${type}-${id}`));
    }
  };

  const handleBulkRestore = async () => {
    if (!confirm(`Restore ${selectedKeys.length} selected items back to vault?`)) return;

    for (const key of selectedKeys) {
      const [type, idStr] = key.split('-');
      const id = parseInt(idStr, 10);
      await restoreMut.mutateAsync({ itemType: type as 'file' | 'folder', itemId: id });
    }
    handleClearSelection();
  };

  const handleBulkPurge = async () => {
    if (!confirm(`Permanently purge ${selectedKeys.length} selected items? This cannot be undone.`)) return;

    for (const key of selectedKeys) {
      const [type, idStr] = key.split('-');
      const id = parseInt(idStr, 10);
      await purgeMut.mutateAsync({ itemType: type as 'file' | 'folder', itemId: id });
    }
    handleClearSelection();
  };

  return (
    <div className="fd-fade-in space-y-6">
      {/* Content Header */}
      <div className="content-header fd-fade-in">
        <div>
          <h1 className="page-title">Recycle Bin</h1>
          <p className="page-subtitle">
            Recover soft-deleted items. Only family administrators can permanently purge records.
          </p>
        </div>
      </div>

      {/* Toolbar with Select All Checkbox */}
      <div
        className="browser-toolbar"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.65rem 1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="fd-select-checkbox-container" style={{ marginBottom: 0 }} title="Select All Items">
            <input
              type="checkbox"
              id="select-all-checkbox"
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
            />
            <span className="fd-select-checkmark" />
          </label>
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-ink-muted)',
              fontWeight: 500,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            id="select-all-text-btn"
            onClick={handleToggleSelectAll}
          >
            Select All
          </span>
        </div>

        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-ink-muted)',
            backgroundColor: 'var(--surface-paper-tint)',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-paper)',
          }}
        >
          {items.length} Item{items.length !== 1 ? 's' : ''} in Trash
        </span>
      </div>

      {/* Main Explorer Surface */}
      <div className="famdoc-card" style={{ minHeight: '400px' }}>
        {isLoading ? (
          <div className="empty-state" style={{ padding: '4rem 0' }}>
            <i className="fas fa-spinner fa-spin state-icon loading" aria-hidden="true" />
            <p className="empty-state-text">Loading deleted records...</p>
          </div>
        ) : items.length === 0 ? (
          <div id="recycle-empty" className="empty-state" style={{ display: 'flex', padding: '4rem 0' }}>
            <i className="fas fa-trash-restore empty-state-icon" aria-hidden="true" />
            <h3 className="empty-state-title">Recycle bin is empty</h3>
            <p className="empty-state-text">No folders or files have been deleted recently.</p>
          </div>
        ) : (
          <div id="recycle-list" className="items-list">
            {items.map((item, index) => {
              const key = `${item.item_type}-${item.id}`;
              const isSelected = selectedKeys.includes(key);
              const iconClass =
                item.item_type === 'folder'
                  ? 'item-icon folder fas fa-folder'
                  : `item-icon ${api.helpers.getFileIconClass(item.name, '')}`;

              return (
                <div
                  key={key}
                  className={`vault-item fd-fade-up fd-stagger ${isSelected ? 'selected' : ''}`}
                  style={{ '--fd-delay': `${index * 0.05}s` } as React.CSSProperties}
                >
                  <label
                    className="fd-select-checkbox-container"
                    style={{ marginLeft: '0.5rem', marginRight: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="item-select-checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(key)}
                    />
                    <span className="fd-select-checkmark" />
                  </label>

                  <i className={iconClass} aria-hidden="true" />

                  <div className="item-details">
                    <div className="item-name" title={item.name}>
                      {item.name}
                    </div>
                    <div className="item-meta-size">
                      {item.size ? api.helpers.formatBytes(item.size) : item.item_type === 'folder' ? 'Folder' : '—'}
                    </div>
                    <div className="item-meta-date">
                      Deleted: {api.helpers.formatDate(item.deleted_at).split(',')[0]}
                    </div>
                    <div className="item-meta-uploader">—</div>
                  </div>

                  <div className="item-actions-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => handleRestore(item.item_type, item.id, item.name)}
                    >
                      <i className="fas fa-undo" aria-hidden="true" />
                      <span>Restore</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => handlePurge(item.item_type, item.id, item.name)}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true" />
                        <span>Purge</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <div id="bulk-actions-bar" className={`bulk-actions-bar ${selectedKeys.length > 0 ? 'show' : ''}`}>
        <div className="bulk-selected-count">
          <span id="bulk-selected-text">
            {selectedKeys.length} item{selectedKeys.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="bulk-action-buttons">
          <button type="button" className="btn btn-secondary" id="bulk-clear-btn" onClick={handleClearSelection}>
            <i className="fas fa-times" aria-hidden="true" /> Cancel
          </button>
          <button type="button" className="btn btn-secondary" id="bulk-restore-btn" onClick={handleBulkRestore}>
            <i className="fas fa-undo" aria-hidden="true" /> Restore
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-danger"
              id="bulk-purge-btn"
              style={{ backgroundColor: 'var(--warning-red)', color: 'white', borderColor: 'var(--warning-red)' }}
              onClick={handleBulkPurge}
            >
              <i className="fas fa-trash-alt" aria-hidden="true" /> Purge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
