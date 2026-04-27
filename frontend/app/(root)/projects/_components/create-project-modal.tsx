'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { createProject } from '@/API/project.api';
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
import { createProjectSchema, type CreateProjectSchema } from '@/schema/project.schema';

type CreateProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreateProjectModal({ open, onOpenChange, onCreated }: CreateProjectModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectSchema>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = async (values: CreateProjectSchema) => {
    const result = await createProject({
      name: values.name,
      description: values.description?.trim() ? values.description : undefined,
    });
    if (result.success) {
      toast.success('Project created');
      reset();
      onOpenChange(false);
      onCreated();
    } else {
      toast.error(result.response as string);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Create a project workspace. You can invite teammates after it is created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-project-name">Name</Label>
            <Input
              id="create-project-name"
              placeholder="Marketing site"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-project-desc">Description (optional)</Label>
            <Textarea
              id="create-project-desc"
              placeholder="Short summary…"
              rows={3}
              className="resize-none"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
