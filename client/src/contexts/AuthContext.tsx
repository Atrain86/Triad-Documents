import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'client';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // TEMPORARILY DISABLED AUTH - Auto-login with mock user
  const [user, setUser] = useState<User | null>({
    id: 1,
    email: "cortespainter@gmail.com",
    firstName: "Paint",
    lastName: "Brain", 
    role: "admin"
  });
  const [isLoading, setIsLoading] = useState(false); // No loading needed

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const authOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(url, authOptions);
    
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      setUser(null);
      throw new Error('Authentication expired');
    }
    
    return response;
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await makeAuthenticatedRequest('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  // TEMPORARILY DISABLED - Skip auth check during development
  // useEffect(() => {
  //   checkAuthStatus();
  // }, []);

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    makeAuthenticatedRequest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};