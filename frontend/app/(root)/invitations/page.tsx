'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Search } from 'lucide-react';
import { toast } from 'sonner';

import { getCurrentUserInvitations, updateInvitationStatus } from '@/API/project-invitations.api';
import { InvitationStatus } from '@/lib/enums';
import type { GetAllProjectInvitationsDataSchema, ProjectInvitationSchema } from '@/schema/project-invitation.schema';

import { InvitationRow } from './_components/invitation-row';

export default function InvitationsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [invitations, setInvitations] = useState<ProjectInvitationSchema[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    const result = await getCurrentUserInvitations({
      limit: 60,
      search: debouncedSearch || undefined,
      sort: 'updatedAt',
    });
    setLoading(false);
    if (result.success && result.response && typeof result.response === 'object' && 'invitations' in result.response) {
      const data = result.response as GetAllProjectInvitationsDataSchema;
      setInvitations(data.invitations);
      setTotalCount(data.pagination.totalCount);
    } else if (!result.success) {
      toast.error(result.response as string);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadInvitations();
    });
  }, [loadInvitations]);

  const handleStatus = async (
    invitation: ProjectInvitationSchema,
    status: InvitationStatus.ACCEPTED | InvitationStatus.REJECTED,
  ) => {
    setUpdatingId(invitation.id);
    const result = await updateInvitationStatus(invitation.id, { status });
    setUpdatingId(null);
    if (result.success) {
      toast.success(status === InvitationStatus.ACCEPTED ? 'Invitation accepted' : 'Invitation declined');
      await loadInvitations();
    } else {
      toast.error(result.response as string);
    }
  };

  const filtered = invitations;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Invitations</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {loading ? 'Loading…' : `${totalCount} invitation${totalCount === 1 ? '' : 's'} total`}
          </p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search invitations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-sm transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-10 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Mail className="mx-auto mb-3 size-10 text-gray-300" />
          <p className="text-sm text-gray-500">No invitations yet.</p>
          <p className="mt-1 text-xs text-gray-400">When someone invites you to a project, it will show up here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((invitation) => (
            <li key={invitation.id}>
              <InvitationRow
                invitation={invitation}
                updating={updatingId === invitation.id}
                onAccept={() => void handleStatus(invitation, InvitationStatus.ACCEPTED)}
                onReject={() => void handleStatus(invitation, InvitationStatus.REJECTED)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
