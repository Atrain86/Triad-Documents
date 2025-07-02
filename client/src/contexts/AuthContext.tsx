import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'client';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(tokenToVerify);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem("auth_token");
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("auth_token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("auth_token", userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function for making authenticated API requests
export function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });
}