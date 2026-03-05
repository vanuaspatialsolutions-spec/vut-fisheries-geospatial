import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// DEMO - replace with real auth when backend is ready
const DEMO_USER = {
  firstName: 'Demo',
  lastName: 'User',
  role: 'staff',
  email: 'demo@fisheries.gov.vu',
};

export function AuthProvider({ children }) {
  const [user] = useState(DEMO_USER);
  const loading = false;

  const login = async () => user;
  const logout = () => {};
  const isAdmin = false;
  const isStaff = true;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
