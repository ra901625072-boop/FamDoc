import { useState } from 'react';
import { useFamilyDetails, useFamilyMembers, useRemoveFamilyMember, useRegenerateSecretCode } from '../api/hooks';
import { useCurrentUser } from '../api/hooks';
import { Users, KeyRound, Copy, Check, Shield, UserX, RefreshCw } from 'lucide-react';

export function FamilyPage() {
  const { data: user } = useCurrentUser();
  const { data: family, isLoading: familyLoading } = useFamilyDetails();
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const removeMemberMut = useRemoveFamilyMember();
  const regenCodeMut = useRegenerateSecretCode();

  const [copied, setCopied] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handleCopyCode = () => {
    if (family?.secret_code) {
      navigator.clipboard.writeText(family.secret_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (confirm('Regenerate family secret code? The old code will immediately stop working for new invites.')) {
      await regenCodeMut.mutateAsync();
    }
  };

  const handleRemove = async (memberId: number, memberName: string) => {
    if (confirm(`Remove member "${memberName}" from the family vault?`)) {
      await removeMemberMut.mutateAsync(memberId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-ink)]">Family Group Management</h1>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1">
            Manage household members and invite permissions for {family?.name || 'your family'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-paper-tint)] text-[var(--text-ink)] border border-[var(--border-paper)]">
            {members.length} / {family?.max_members || 10} Members
          </span>
        </div>
      </div>

      {/* Secret Invite Code Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Family Secret Invite Code</h2>
            <p className="text-[11px] text-emerald-200">
              Share this code with family members so they can join your cloud vault from web or Android.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 p-3 px-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-base font-bold tracking-widest text-emerald-300 select-all flex items-center justify-between">
            <span>{familyLoading ? 'LOADING...' : family?.secret_code || 'FAMD-0000-0000'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleRegenerateCode}
                title="Regenerate secret invite code"
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members Roster Table */}
      <div className="rounded-3xl bg-[var(--surface-card)] border border-[var(--border-paper)] overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[var(--border-paper)] flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-ink)]">Roster of Members</h2>
        </div>

        {membersLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-ink-muted)]">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-ink-muted)]">No members joined yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border-paper)]">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 px-6 hover:bg-[var(--surface-paper-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {m.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-ink)]">{m.username}</span>
                      {m.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-paper-tint)] text-[var(--text-ink-muted)]">
                          Member
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-ink-muted)] mt-0.5">{m.email}</div>
                  </div>
                </div>

                {isAdmin && m.id !== user?.id && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m.id, m.username)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Remove member from vault"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
