import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchApi } from '../utils/api';

interface User {
    id: string | number;
    email: string;
    full_name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, refresh?: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('access'));
    const [loading, setLoading] = useState(true);

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (token && !user) {
                try {
                    const userData = await fetchApi('/auth/profile/');
                    setUser(userData);
                } catch (error) {
                    console.error("Failed to fetch profile", error);
                    logout();
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, [token, user]);

    const login = async (newToken: string, refreshToken?: string) => {
        setToken(newToken);
        localStorage.setItem('access', newToken);
        if (refreshToken) localStorage.setItem('refresh', refreshToken);
        
        // Fetch user profile immediately after login
        try {
            const userData = await fetchApi('/auth/profile/', {
                headers: { Authorization: `Bearer ${newToken}` }
            });
            setUser(userData);
        } catch(e) {
            console.error(e);
        }
    };

    const isAuthenticated = !!user && !!token;

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
