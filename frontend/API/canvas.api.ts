import { AxiosError } from 'axios';
import api from './middleware';
import type { CanvasNodeSchema } from '@/schema/canvas.schema';

export const getCanvasNodes = async (projectId: string) => {
  try {
    const { data } = await api.get(`/canvas/${projectId}/nodes`, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data as CanvasNodeSchema[] };
    }
    return { success: false, response: data?.message || 'Failed to fetch canvas nodes' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to fetch canvas nodes' };
    }
    return { success: false, response: 'Failed to fetch canvas nodes' };
  }
};
