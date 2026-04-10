import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password });
    setUser(res.data);
    localStorage.setItem('user', JSON.stringify(res.data));
  };
  
  const googleLogin = async (credential) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/google`, { credential });
    setUser(res.data);
    localStorage.setItem('user', JSON.stringify(res.data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateProfile = async (name) => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/profile`, { name }, config);
        const updatedUser = { ...user, name: res.data.name };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
     } catch (err) {
        console.error("Error updating profile", err);
     }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
