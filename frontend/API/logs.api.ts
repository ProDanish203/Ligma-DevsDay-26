import { AxiosError } from 'axios';
import api from './middleware';
import { LogEntityType } from '@/lib/enums';
import { type ApiListQuerySchema } from '@/schema/common.schema';

export const getLogsByEntity = async (entityType: LogEntityType, entityId: string, query?: ApiListQuerySchema) => {
  try {
    const { data } = await api.get(`/logs/${entityType}/${entityId}`, { params: query, withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to get logs' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get logs' };
    }
    return { success: false, response: 'Failed to get logs' };
  }
};
