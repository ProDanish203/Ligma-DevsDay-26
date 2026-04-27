import { AxiosError } from 'axios';
import api from './middleware';
import { LoginSchema, RegisterSchema } from '@/schema/auth.schema';

export const register = async (payload: RegisterSchema) => {
  try {
    const { data } = await api.post('/auth/register', payload, { withCredentials: true });

    if (data?.success) {
      return {
        success: true,
        response: data.data,
      };
    } else {
      return {
        success: false,
        response: data?.message || 'Registration failed',
      };
    }
  } catch (error: AxiosError | unknown) {
    if (error instanceof AxiosError) {
      return {
        success: false,
        response: error.response?.data?.message || 'An unknown error occurred',
      };
    }
    return { success: false, response: 'An unknown error occurred' };
  }
};

export const login = async (payload: LoginSchema) => {
  try {
    const { data } = await api.post('/auth/login', payload, { withCredentials: true });
    if (data?.success) {
      return {
        success: true,
        response: data.data,
      };
    } else {
      return {
        success: false,
        response: data?.message || 'Login failed',
      };
    }
  } catch (error: AxiosError | unknown) {
    if (error instanceof AxiosError) {
      return {
        success: false,
        response: error.response?.data?.message || 'An unknown error occurred',
      };
    }
    return { success: false, response: 'An unknown error occurred' };
  }
};

export const logout = async () => {
  try {
    const { data } = await api.post('/auth/logout', {}, { withCredentials: true });
    if (data?.success) {
      return {
        success: true,
        response: data.message || 'Logout successful',
      };
    }
    return {
      success: false,
      response: data?.message || 'Logout failed',
    };
  } catch (error: AxiosError | unknown) {
    if (error instanceof AxiosError) {
      return {
        success: false,
        response: error.response?.data?.message || 'An unknown error occurred',
      };
    }
    return { success: false, response: 'An unknown error occurred' };
  }
};

export const signInWithGoogle = async () => {
  try {
    if (typeof window === 'undefined') {
      return {
        success: false,
        response: 'Google sign-in is only available in the browser',
      };
    }

    const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    const googleAuthUrl = `${baseURL}/auth/google`;

    window.location.href = googleAuthUrl;

    return {
      success: true,
      response: 'Redirecting to Google...',
    };
  } catch (error: AxiosError | unknown) {
    if (error instanceof AxiosError) {
      return {
        success: false,
        response: error.response?.data?.message || 'An unknown error occurred',
      };
    }
    return { success: false, response: 'An unknown error occurred' };
  }
};
