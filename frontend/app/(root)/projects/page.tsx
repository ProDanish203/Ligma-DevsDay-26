'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { getAllProjects } from '@/API/project.api';
import { Button } from '@/components/ui/button';
import type { ProjectWithMyAccessSchema } from '@/schema/project.schema';

import { CreateProjectModal } from './_components/create-project-modal';
import { EditProjectModal } from './_components/edit-project-modal';
import { ProjectAccessModal } from './_components/project-access-modal';
import { ProjectCard } from './_components/project-card';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [projects, setProjects] = useState<ProjectWithMyAccessSchema[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectWithMyAccessSchema | null>(null);
  const [accessProject, setAccessProject] = useState<ProjectWithMyAccessSchema | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const result = await getAllProjects({
      limit: 60,
      search: debouncedSearch || undefined,
      sort: 'updatedAt',
    });
    setLoading(false);
    if (result.success && result.response && typeof result.response === 'object' && 'projects' in result.response) {
      const data = result.response as { projects: ProjectWithMyAccessSchema[]; pagination: { totalCount: number } };
      setProjects(data.projects);
      setTotalCount(data.pagination.totalCount);
    } else if (!result.success) {
      toast.error(result.response as string);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadProjects();
    });
  }, [loadProjects]);

  const filtered = projects;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {loading ? 'Loading…' : `${totalCount} project${totalCount === 1 ? '' : 's'} total`}
          </p>
        </div>
        <Button
          type="button"
          className="h-9 gap-2 rounded-xl bg-linear-to-r from-brand-primary to-brand-secondary px-4 text-sm font-semibold text-white shadow-sm shadow-brand-primary/20 hover:opacity-90"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          New Project
        </Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects…"
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
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              onEdit={() => setEditProject(project)}
              onAccess={() => setAccessProject(project)}
            />
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} onCreated={loadProjects} />

      <EditProjectModal
        open={!!editProject}
        onOpenChange={(o) => !o && setEditProject(null)}
        project={editProject}
        onUpdated={loadProjects}
      />

      <ProjectAccessModal
        open={!!accessProject}
        onOpenChange={(o) => !o && setAccessProject(null)}
        project={accessProject}
        onChanged={loadProjects}
      />
    </div>
  );
}
