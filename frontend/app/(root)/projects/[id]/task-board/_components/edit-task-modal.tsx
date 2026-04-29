'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { updateTask } from '@/API/task-board.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateTaskSchema, type TaskSchema, type UpdateTaskSchema } from '@/schema/task-board.schema';

type EditTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskSchema | null;
  projectId: string;
  onUpdated: (task: TaskSchema) => void;
};

export function EditTaskModal({ open, onOpenChange, task, projectId, onUpdated }: EditTaskModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTaskSchema>({
    resolver: zodResolver(updateTaskSchema as any),
    defaultValues: { title: '', description: '' },
  });

  useEffect(() => {
    if (task) {
      reset({ title: task.title, description: task.description ?? '' });
    }
  }, [task, reset]);

  const onSubmit = async (values: UpdateTaskSchema) => {
    if (!task) return;
    const result = await updateTask(projectId, task.id, values);
    if (result.success) {
      toast.success('Task updated');
      onUpdated(result.response as TaskSchema);
      onOpenChange(false);
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
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-title">Title</Label>
            <Input
              id="edit-task-title"
              placeholder="Task title"
              autoComplete="off"
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-task-desc">Description (optional)</Label>
            <Textarea
              id="edit-task-desc"
              placeholder="Add more detail…"
              rows={4}
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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
