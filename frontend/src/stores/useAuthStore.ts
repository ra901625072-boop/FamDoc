import { create } from 'zustand';
import type { User } from '../api/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user?: User | null) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = typeof window !== 'undefined' ? localStorage.getItem('famdoc_token') : null;
  let initialUser: User | null = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('famdoc_user');
      if (stored) initialUser = JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: Boolean(initialToken),

    setAuth: (token: string, user?: User | null) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('famdoc_token', token);
        if (user) {
          localStorage.setItem('famdoc_user', JSON.stringify(user));
        }
      }
      set({ token, user: user || null, isAuthenticated: true });
    },

    setUser: (user: User) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('famdoc_user', JSON.stringify(user));
      }
      set({ user });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('famdoc_token');
        localStorage.removeItem('famdoc_user');
      }
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
