import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
  });

  const navigate = useNavigate();

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usr: credentials.email,
          pwd: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message === 'Logged In') {
        // Get user info after successful login
        const userResponse = await fetch(`/api/method/frappe.auth.get_logged_user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const userData = await userResponse.json();

        if (userResponse.ok) {
          setAuthState({
            isAuthenticated: true,
            user: userData.message,
            loading: false,
            error: null,
          });
          
          // Store session in localStorage
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user', JSON.stringify(userData.message));
          
          // Use setTimeout to ensure state is updated before navigation
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 100);
          
          return { success: true };
        }
      }

      throw new Error(data.exc || 'Login failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await fetch(`/api/method/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
      
      // Clear session from localStorage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      navigate('/login');
    }
  }, [navigate]);

  const checkAuth = useCallback(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    console.log('checkAuth - isAuthenticated:', isAuthenticated, 'user:', user);

    setAuthState({
      isAuthenticated,
      user,
      loading: false,
      error: null,
    });

    return isAuthenticated;
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
};
