'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteProject, updateProject } from '@/API/project.api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { canEditProjectDetails, isProjectOwner } from '@/lib/project-permissions';
import { updateProjectSchema, type ProjectWithMyAccessSchema, type UpdateProjectSchema } from '@/schema/project.schema';

type EditProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithMyAccessSchema | null;
  onUpdated: () => void;
};

export function EditProjectModal({ open, onOpenChange, project, onUpdated }: EditProjectModalProps) {
  const canEdit = project ? canEditProjectDetails(project.myAccess) : false;
  const owner = project ? isProjectOwner(project.myAccess) : false;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProjectSchema>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: { name: '', description: '' },
    values: project
      ? {
          name: project.name,
          description: project.description ?? '',
        }
      : { name: '', description: '' },
  });

  useEffect(() => {
    if (!open && project) {
      reset({
        name: project.name,
        description: project.description ?? '',
      });
    }
  }, [open, project, reset]);

  const onSave = async (values: UpdateProjectSchema) => {
    if (!project) return;
    const payload: UpdateProjectSchema = {
      name: values.name?.trim() !== project.name ? values.name : undefined,
      description:
        (values.description ?? '').trim() !== (project.description ?? '').trim()
          ? (values.description ?? '').trim() || undefined
          : undefined,
    };
    if (payload.name === undefined && payload.description === undefined) {
      toast.message('No changes to save');
      return;
    }
    const result = await updateProject(project.id, payload);
    if (result.success) {
      toast.success('Project updated');
      onOpenChange(false);
      onUpdated();
    } else {
      toast.error(result.response as string);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    const result = await deleteProject(project.id);
    if (result.success) {
      toast.success('Project deleted');
      setDeleteOpen(false);
      onOpenChange(false);
      onUpdated();
    } else {
      toast.error(result.response as string);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              {canEdit
                ? 'Update the project name or description.'
                : 'Only the project owner or a lead can edit project details.'}
            </DialogDescription>
          </DialogHeader>
          {project && (
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-name">Name</Label>
                <Input id="edit-project-name" disabled={!canEdit} aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-desc">Description</Label>
                <Textarea
                  id="edit-project-desc"
                  rows={3}
                  className="resize-none"
                  disabled={!canEdit}
                  {...register('description')}
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button type="submit" disabled={!canEdit || isSubmitting} className="gap-2">
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    Save
                  </Button>
                </div>
                {owner && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto sm:self-start"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete project
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the project for your account. This action cannot be undone from the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
