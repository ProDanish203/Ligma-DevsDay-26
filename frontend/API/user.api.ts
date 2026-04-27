import { AxiosError } from 'axios';
import api from './middleware';
import { type UpdateUserSchema } from '@/schema/user.schema';

export const getCurrentUser = async () => {
  try {
    const { data } = await api.get('/user/me', { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to get current user' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get current user' };
    }
    return { success: false, response: 'Failed to get current user' };
  }
};

export const updateCurrentUser = async (payload: UpdateUserSchema) => {
  try {
    const { data } = await api.patch('/user/me', payload, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to update user profile' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to update user profile' };
    }
    return { success: false, response: 'Failed to update user profile' };
  }
};
