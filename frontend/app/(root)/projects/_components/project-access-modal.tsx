'use client';

import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { getProjectMembers, removeProjectMember, updateProjectMemberAccess } from '@/API/project.api';
import { getProjectInvitations, inviteUserToProject, revokeInvitation } from '@/API/project-invitations.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAccessLevel, InvitationStatus } from '@/lib/enums';
import {
  accessLevelOptionsForInvite,
  accessLevelOptionsForMemberSelect,
  canChangeMemberRole,
  canManageProjectAccess,
  isProjectOwner,
} from '@/lib/project-permissions';
import { formatRelativeTime } from '@/lib/format-relative';
import { inviteUserSchema, type ProjectInvitationSchema } from '@/schema/project-invitation.schema';
import type { GetProjectMembersDataSchema, ProjectWithMyAccessSchema } from '@/schema/project.schema';

const inviteFieldsSchema = inviteUserSchema.pick({ email: true, accessLevel: true });
type InviteFields = z.infer<typeof inviteFieldsSchema>;

const LEVEL_LABEL: Record<UserAccessLevel, string> = {
  [UserAccessLevel.VIEWER]: 'Viewer',
  [UserAccessLevel.COMMENTATOR]: 'Commentator',
  [UserAccessLevel.EDITOR]: 'Editor',
  [UserAccessLevel.LEAD]: 'Lead',
};

type ProjectAccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithMyAccessSchema | null;
  onChanged: () => void;
};

export function ProjectAccessModal({ open, onOpenChange, project, onChanged }: ProjectAccessModalProps) {
  const [membersData, setMembersData] = useState<GetProjectMembersDataSchema | null>(null);
  const [invitations, setInvitations] = useState<ProjectInvitationSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canManage = project ? canManageProjectAccess(project.myAccess) : false;
  const ownerFlag = project ? isProjectOwner(project.myAccess) : false;

  const loadData = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        getProjectMembers(project.id),
        getProjectInvitations(project.id, { limit: 50 }),
      ]);
      if (mRes.success) {
        setMembersData(mRes.response as GetProjectMembersDataSchema);
      } else {
        toast.error(mRes.response as string);
      }
      if (iRes.success && iRes.response && typeof iRes.response === 'object' && 'invitations' in iRes.response) {
        setInvitations((iRes.response as { invitations: ProjectInvitationSchema[] }).invitations);
      } else if (!iRes.success) {
        toast.error(iRes.response as string);
      }
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (!open || !project) return;
    queueMicrotask(() => {
      void loadData();
    });
  }, [open, project, loadData]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InviteFields>({
    resolver: zodResolver(inviteFieldsSchema as any),
    defaultValues: {
      email: '',
      accessLevel: UserAccessLevel.VIEWER,
    },
  });

  useEffect(() => {
    if (open && project) {
      reset({ email: '', accessLevel: UserAccessLevel.VIEWER });
    }
  }, [open, project, reset]);

  const inviteOptions = accessLevelOptionsForInvite(ownerFlag);

  const onInvite = async (values: InviteFields) => {
    if (!project) return;
    const result = await inviteUserToProject({
      email: values.email,
      projectId: project.id,
      accessLevel: values.accessLevel,
    });
    if (result.success) {
      toast.success('Invitation sent');
      reset({ email: '', accessLevel: UserAccessLevel.VIEWER });
      await loadData();
      onChanged();
    } else {
      toast.error(result.response as string);
    }
  };

  const onRoleChange = async (userAccessId: string, accessLevel: UserAccessLevel) => {
    if (!project) return;
    setUpdatingId(userAccessId);
    const result = await updateProjectMemberAccess(project.id, userAccessId, { accessLevel });
    setUpdatingId(null);
    if (result.success) {
      toast.success('Role updated');
      await loadData();
      onChanged();
    } else {
      toast.error(result.response as string);
    }
  };

  const onRemoveMember = async (userAccessId: string) => {
    if (!project) return;
    setUpdatingId(userAccessId);
    const result = await removeProjectMember(project.id, userAccessId);
    setUpdatingId(null);
    if (result.success) {
      toast.success('Member removed');
      await loadData();
      onChanged();
    } else {
      toast.error(result.response as string);
    }
  };

  const onRevoke = async (invitationId: string) => {
    const result = await revokeInvitation(invitationId);
    if (result.success) {
      toast.success('Invitation revoked');
      await loadData();
      onChanged();
    } else {
      toast.error(result.response as string);
    }
  };

  const pendingInvites = invitations.filter((i) => i.status === InvitationStatus.PENDING);
  const pendingCount = pendingInvites.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setMembersData(null);
          setInvitations([]);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" showClose>
        <DialogHeader>
          <DialogTitle>Project access</DialogTitle>
          <DialogDescription>
            {project?.name ? `Members and invitations for “${project.name}”.` : 'Members and invitations.'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && membersData && (
          <Tabs defaultValue="members" className="w-full">
            <TabsList variant="line" className="mb-1 w-full min-w-0">
              <TabsTrigger value="invite" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <UserPlus className="size-3.5 shrink-0 sm:size-4" />
                Invite
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <Users className="size-3.5 shrink-0 sm:size-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 gap-1.5 text-xs sm:text-sm">
                <Mail className="size-3.5 shrink-0 sm:size-4" />
                <span className="truncate">Pending</span>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 tabular-nums">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="invite"
              className="mt-4 max-h-[min(52vh,420px)] overflow-y-auto pr-1 focus-visible:outline-none"
            >
              {!canManage ? (
                <p className="text-sm text-gray-500">
                  Only the project owner or a lead can invite people or assign roles.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    The person must already have an account. Only owners can assign the Lead role.
                  </p>
                  <form onSubmit={handleSubmit(onInvite)} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@company.com"
                        {...register('email')}
                      />
                      {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Access level</Label>
                      <Controller
                        name="accessLevel"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {inviteOptions.map((lvl) => (
                                <SelectItem key={lvl} value={lvl}>
                                  {LEVEL_LABEL[lvl]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
                      {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                      Send invite
                    </Button>
                  </form>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="members"
              className="mt-4 max-h-[min(52vh,420px)] overflow-y-auto pr-1 focus-visible:outline-none"
            >
              <div className="space-y-5">
                <section>
                  <h3 className="text-sm font-semibold text-gray-900">Owner</h3>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{membersData.owner.name}</p>
                      <p className="text-xs text-gray-500">{membersData.owner.email}</p>
                    </div>
                    <Badge variant="outline" className="border-brand-primary/30 bg-pink-50 text-brand-primary">
                      Owner
                    </Badge>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-900">Members</h3>
                  <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100">
                    {membersData.members.length === 0 && (
                      <li className="px-3 py-4 text-sm text-gray-500">No collaborators yet.</li>
                    )}
                    {membersData.members.map((m) => {
                      const canChange = canChangeMemberRole(project!.myAccess, m.accessLevel);
                      const selectOptions = accessLevelOptionsForMemberSelect(ownerFlag);
                      return (
                        <li
                          key={m.userAccessId}
                          className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{m.name}</p>
                            <p className="truncate text-xs text-gray-500">{m.email}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {canChange ? (
                              <Select
                                value={m.accessLevel}
                                disabled={updatingId === m.userAccessId}
                                onValueChange={(v) => void onRoleChange(m.userAccessId, v as UserAccessLevel)}
                              >
                                <SelectTrigger className="w-full min-w-35 sm:w-40" size="sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectOptions.map((lvl) => (
                                    <SelectItem key={lvl} value={lvl}>
                                      {LEVEL_LABEL[lvl]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="w-fit">
                                {LEVEL_LABEL[m.accessLevel]}
                              </Badge>
                            )}
                            {ownerFlag && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={updatingId === m.userAccessId}
                                onClick={() => void onRemoveMember(m.userAccessId)}
                                className="shrink-0 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </TabsContent>

            <TabsContent
              value="pending"
              className="mt-4 max-h-[min(52vh,420px)] overflow-y-auto pr-1 focus-visible:outline-none"
            >
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-gray-500">No pending invitations.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingInvites.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{inv.email}</p>
                        <p className="text-xs text-gray-400">Invited {formatRelativeTime(inv.createdAt)}</p>
                      </div>
                      {canManage && (
                        <Button type="button" variant="outline" size="sm" onClick={() => void onRevoke(inv.id)}>
                          Revoke
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
