import { AxiosError } from 'axios';
import api from './middleware';
import { type ApiListQuerySchema } from '@/schema/common.schema';
import { type CreateProjectSchema, type UpdateProjectSchema } from '@/schema/project.schema';

export const createProject = async (payload: CreateProjectSchema) => {
  try {
    const { data } = await api.post('/project/create', payload, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to create project' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to create project' };
    }
    return { success: false, response: 'Failed to create project' };
  }
};

export const updateProject = async (projectId: string, payload: UpdateProjectSchema) => {
  try {
    const { data } = await api.patch(`/project/${projectId}`, payload, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to update project' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to update project' };
    }
    return { success: false, response: 'Failed to update project' };
  }
};

export const getAllProjects = async (query?: ApiListQuerySchema) => {
  try {
    const { data } = await api.get('/project/all', { params: query, withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to get projects' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get projects' };
    }
    return { success: false, response: 'Failed to get projects' };
  }
};

export const getProjectById = async (projectId: string) => {
  try {
    const { data } = await api.get(`/project/${projectId}`, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to get project' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get project' };
    }
    return { success: false, response: 'Failed to get project' };
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    const { data } = await api.delete(`/project/${projectId}`, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.message || 'Project deleted successfully' };
    }
    return { success: false, response: data?.message || 'Failed to delete project' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to delete project' };
    }
    return { success: false, response: 'Failed to delete project' };
  }
};
