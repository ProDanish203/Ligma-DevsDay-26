import { AxiosError } from 'axios';
import api from './middleware';
import type { UpdateTaskSchema } from '@/schema/task-board.schema';

export const getTaskBoard = async (projectId: string) => {
  try {
    const { data } = await api.get(`/task-board/${projectId}`, { withCredentials: true });
    if (data?.success) return { success: true, response: data.data };
    return { success: false, response: data?.message || 'Failed to get task board' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get task board' };
    }
    return { success: false, response: 'Failed to get task board' };
  }
};

export const updateTask = async (projectId: string, taskId: string, payload: UpdateTaskSchema) => {
  try {
    const { data } = await api.patch(`/task-board/${projectId}/task/${taskId}`, payload, { withCredentials: true });
    if (data?.success) return { success: true, response: data.data };
    return { success: false, response: data?.message || 'Failed to update task' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to update task' };
    }
    return { success: false, response: 'Failed to update task' };
  }
};

export const deleteTask = async (projectId: string, taskId: string) => {
  try {
    const { data } = await api.delete(`/task-board/${projectId}/task/${taskId}`, { withCredentials: true });
    if (data?.success) return { success: true, response: data.message || 'Task deleted' };
    return { success: false, response: data?.message || 'Failed to delete task' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to delete task' };
    }
    return { success: false, response: 'Failed to delete task' };
  }
};
