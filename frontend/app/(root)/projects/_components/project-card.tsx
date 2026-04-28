'use client';

import { Clock, MoreHorizontal, Pencil, Users } from 'lucide-react';
import Avatar from 'boring-avatars';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BRAND_AVATAR_PALETTE } from '@/lib/constants';
import { canEditProjectDetails, canManageProjectAccess, isProjectOwner } from '@/lib/project-permissions';
import { formatRelativeTime } from '@/lib/format-relative';
import type { ProjectWithMyAccessSchema } from '@/schema/project.schema';

const GRADIENTS = [
  'from-[#F43F7A] to-[#FDA4C4]',
  'from-[#818CF8] to-[#C4B5FD]',
  'from-[#F43F7A] to-[#FB923C]',
  'from-[#38BDF8] to-[#818CF8]',
  'from-[#34D399] to-[#818CF8]',
];

type ProjectCardProps = {
  project: ProjectWithMyAccessSchema;
  index: number;
  onEdit: () => void;
  onAccess: () => void;
};

export function ProjectCard({ project, index, onEdit, onAccess }: ProjectCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const shared = !isProjectOwner(project.myAccess);
  const canEdit = canEditProjectDetails(project.myAccess);
  const canManage = canManageProjectAccess(project.myAccess);

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-pink-200 hover:shadow-md hover:shadow-pink-50">
      <Link href={`/projects/${project.id}`} className="block">
        <div className={`relative h-36 bg-linear-to-br ${gradient}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-2 opacity-15">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-8 w-12 rounded bg-white" />
              ))}
            </div>
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-2">
            {shared && (
              <Badge variant="secondary" className="border-0 bg-white/90 text-gray-700 shadow-sm">
                Shared
              </Badge>
            )}
          </div>
          <div className="absolute right-2 top-2" onClick={(e) => e.preventDefault()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-8 rounded-lg bg-black/10 text-white hover:bg-black/20 hover:text-white"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={onAccess}>
                  <Users className="size-4" />
                  Team & invitations
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={onEdit}>
                    <Pencil className="size-4" />
                    Edit project
                  </DropdownMenuItem>
                )}
                {!canEdit && canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <p className="px-2 py-1.5 text-xs text-gray-400">
                      Only the owner or a lead can edit project details.
                    </p>
                  </>
                )}
                {!canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <p className="px-2 py-1.5 text-xs text-gray-400">
                      Only the owner or a lead can manage invites and roles.
                    </p>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-4">
          <p className="truncate font-medium text-gray-800">{project.name}</p>
          {project.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{project.description}</p>}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatRelativeTime(project.updatedAt)}
            </div>
            <div className="flex -space-x-1.5">
              <div className="rounded-full ring-2 ring-white">
                <Avatar size={22} name={project.name} variant="beam" colors={BRAND_AVATAR_PALETTE} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
