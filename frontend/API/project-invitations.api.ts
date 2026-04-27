import { AxiosError } from 'axios';
import api from './middleware';
import { type ApiListQuerySchema } from '@/schema/common.schema';
import { type InviteUserSchema, type UpdateInviteStatusSchema } from '@/schema/project-invitation.schema';

export const getCurrentUserInvitations = async (query?: ApiListQuerySchema) => {
  try {
    const { data } = await api.get('/project-invitations/me', { params: query, withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to get invitations' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get invitations' };
    }
    return { success: false, response: 'Failed to get invitations' };
  }
};

export const getProjectInvitations = async (projectId: string, query?: ApiListQuerySchema) => {
  try {
    const { data } = await api.get(`/project-invitations/project/${projectId}`, {
      params: query,
      withCredentials: true,
    });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to get project invitations' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to get project invitations' };
    }
    return { success: false, response: 'Failed to get project invitations' };
  }
};

export const inviteUserToProject = async (payload: InviteUserSchema) => {
  try {
    const { data } = await api.post('/project-invitations/invite', payload, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to send invitation' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to send invitation' };
    }
    return { success: false, response: 'Failed to send invitation' };
  }
};

export const updateInvitationStatus = async (invitationId: string, payload: UpdateInviteStatusSchema) => {
  try {
    const { data } = await api.patch(`/project-invitations/${invitationId}/status`, payload, {
      withCredentials: true,
    });
    if (data?.success) {
      return { success: true, response: data.data };
    }
    return { success: false, response: data?.message || 'Failed to update invitation status' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return {
        success: false,
        response: error.response?.data?.message || 'Failed to update invitation status',
      };
    }
    return { success: false, response: 'Failed to update invitation status' };
  }
};

export const revokeInvitation = async (invitationId: string) => {
  try {
    const { data } = await api.delete(`/project-invitations/${invitationId}/revoke`, { withCredentials: true });
    if (data?.success) {
      return { success: true, response: data.message || 'Invitation revoked successfully' };
    }
    return { success: false, response: data?.message || 'Failed to revoke invitation' };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { success: false, response: error.response?.data?.message || 'Failed to revoke invitation' };
    }
    return { success: false, response: 'Failed to revoke invitation' };
  }
};
