import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('ai_agent_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Mock login - accept any valid email
    // In a real app, verify against backend
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: 'usr_' + Math.random().toString(36).substr(2, 9),
          email,
          name: email.split('@')[0],
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        };
        localStorage.setItem('ai_agent_user', JSON.stringify(mockUser));
        setUser(mockUser);
        resolve(mockUser);
      }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem('ai_agent_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function withAuth(Component) {
  return function ProtectedRoute(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading || !user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="animate-pulse">Loading Agent Interface...</div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
