import { UserSchema } from '@/schema/user.schema';
import { create } from 'zustand';

interface AuthState {
  user: UserSchema | null;
  setUser: (user: UserSchema) => void;
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user: UserSchema) => set({ user }),
  setToken: (token: string) => set({ token }),
  logout: () => set({ user: null, token: null }),
}));
