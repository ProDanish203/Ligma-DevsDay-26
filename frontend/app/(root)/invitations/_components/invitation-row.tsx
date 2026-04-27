'use client';

import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InvitationStatus, ProjectVisibility } from '@/lib/enums';
import { formatRelativeTime } from '@/lib/format-relative';
import type { ProjectInvitationSchema } from '@/schema/project-invitation.schema';

const visibilityLabel: Record<ProjectVisibility, string> = {
  [ProjectVisibility.PUBLIC]: 'Public',
  [ProjectVisibility.PRIVATE]: 'Private',
};

const statusVariant: Record<InvitationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [InvitationStatus.PENDING]: 'outline',
  [InvitationStatus.ACCEPTED]: 'default',
  [InvitationStatus.REJECTED]: 'secondary',
};

type InvitationRowProps = {
  invitation: ProjectInvitationSchema;
  updating: boolean;
  onAccept: () => void;
  onReject: () => void;
};

export function InvitationRow({ invitation, updating, onAccept, onReject }: InvitationRowProps) {
  const pending = invitation.status === InvitationStatus.PENDING;
  const description = invitation.project.description?.trim();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold text-gray-900">{invitation.project.name}</h2>
          <Badge variant="secondary" className="shrink-0 border-0 font-normal text-gray-600">
            {visibilityLabel[invitation.project.visibility]}
          </Badge>
          <Badge variant={statusVariant[invitation.status]} className="shrink-0 capitalize">
            {invitation.status.toLowerCase()}
          </Badge>
        </div>
        {description ? <p className="line-clamp-2 text-sm text-gray-500">{description}</p> : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>
            To <span className="font-medium text-gray-600">{invitation.email}</span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>Invited {formatRelativeTime(invitation.createdAt)}</span>
        </div>
      </div>

      {pending ? (
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-gray-200"
            disabled={updating}
            onClick={onReject}
          >
            {updating ? <Loader2 className="size-4 animate-spin" /> : 'Reject'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl bg-linear-to-r from-brand-primary to-brand-secondary px-4 font-semibold text-white shadow-sm shadow-brand-primary/20 hover:opacity-90"
            disabled={updating}
            onClick={onAccept}
          >
            {updating ? <Loader2 className="size-4 animate-spin" /> : 'Accept'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
