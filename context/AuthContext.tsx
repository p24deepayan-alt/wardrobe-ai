import React from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUser: (user: User) => void;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  role: 'user',
  isLoading: true,
  login: () => {},
  logout: () => {},
  switchRole: () => {},
  updateUser: () => {},
});