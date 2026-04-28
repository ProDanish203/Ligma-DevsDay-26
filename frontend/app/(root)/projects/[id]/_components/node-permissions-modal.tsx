'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Shield, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { UserAccessLevel } from '@/lib/enums';
import { getProjectMembers } from '@/API/project.api';
import type { NodeAccessEntrySchema } from '@/schema/canvas.schema';
import type { GetProjectMembersDataSchema } from '@/schema/project.schema';

interface NodePermissionsModalProps {
  nodeId: string | null;
  projectId: string;
  accesses: NodeAccessEntrySchema[];
  canManage: boolean;
  onGrant: (nodeId: string, userId: string, accessLevel: UserAccessLevel) => void;
  onRevoke: (nodeId: string, accessId: string) => void;
  onClose: () => void;
}

const ACCESS_LEVEL_LABELS: Record<UserAccessLevel, string> = {
  [UserAccessLevel.VIEWER]: 'Viewer',
  [UserAccessLevel.COMMENTATOR]: 'Commentator',
  [UserAccessLevel.EDITOR]: 'Editor',
  [UserAccessLevel.LEAD]: 'Lead',
};

const ACCESS_LEVEL_COLORS: Record<UserAccessLevel, string> = {
  [UserAccessLevel.VIEWER]: 'bg-gray-100 text-gray-700',
  [UserAccessLevel.COMMENTATOR]: 'bg-blue-100 text-blue-700',
  [UserAccessLevel.EDITOR]: 'bg-green-100 text-green-700',
  [UserAccessLevel.LEAD]: 'bg-purple-100 text-purple-700',
};

export function NodePermissionsModal({
  nodeId,
  projectId,
  accesses,
  canManage,
  onGrant,
  onRevoke,
  onClose,
}: NodePermissionsModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<UserAccessLevel>(UserAccessLevel.EDITOR);
  const [granting, setGranting] = useState(false);

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const result = await getProjectMembers(projectId);
      return result.success ? (result.response as GetProjectMembersDataSchema) : null;
    },
    enabled: !!nodeId && canManage,
    staleTime: 60_000,
  });

  const alreadyGrantedIds = new Set(accesses.map((a) => a.userId));

  // Build selectable members: project members not already granted node access
  const selectableMembers = [...(membersData?.members ?? [])].filter((m) => !alreadyGrantedIds.has(m.userId));

  const handleGrant = () => {
    if (!nodeId || !selectedUserId) return;
    setGranting(true);
    onGrant(nodeId, selectedUserId, selectedLevel);
    setSelectedUserId('');
    setGranting(false);
  };

  return (
    <Dialog
      open={!!nodeId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-xl w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-brand-primary" />
            Node Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="w-full space-y-4 overflow-x-hidden">
          {/* Current ACL list */}
          <div>
            <p className="mb-2 w-full wrap-break-word text-xs font-medium uppercase tracking-wide text-gray-500">
              {accesses.length === 0 ? 'No explicit permissions — inherits project access' : 'Explicit access'}
            </p>
            {accesses.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-200 px-3 py-3 text-center text-sm text-gray-400 whitespace-normal wrap-break-word">
                Anyone with project Editor+ access can edit this node.
              </p>
            ) : (
              <div className="space-y-1.5">
                {accesses.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{entry.user.name}</p>
                      <p className="text-xs text-gray-500">{entry.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-semibold',
                          ACCESS_LEVEL_COLORS[entry.accessLevel],
                        )}
                      >
                        {ACCESS_LEVEL_LABELS[entry.accessLevel]}
                      </span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-gray-400 hover:text-red-500"
                          onClick={() => nodeId && onRevoke(nodeId, entry.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add user section */}
          {canManage && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Grant access</p>
                {loadingMembers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="size-4 animate-spin" /> Loading members…
                  </div>
                ) : selectableMembers.length === 0 ? (
                  <p className="text-sm text-gray-400">All project members already have explicit node access.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 md:flex-nowrap">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="min-w-0 flex-1 text-sm">
                        <SelectValue placeholder="Select member…" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableMembers.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.name} <span className="text-gray-400 text-xs">({m.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as UserAccessLevel)}>
                      <SelectTrigger className="w-full text-sm md:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(UserAccessLevel).map((level) => (
                          <SelectItem key={level} value={level}>
                            {ACCESS_LEVEL_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={handleGrant}
                      disabled={!selectedUserId || granting}
                      className="shrink-0 bg-brand-primary text-white hover:bg-brand-primary/90"
                    >
                      <UserPlus className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {!canManage && (
            <p className="text-xs text-gray-400 text-center">
              You need node Lead access or project Owner/Lead to manage permissions.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
