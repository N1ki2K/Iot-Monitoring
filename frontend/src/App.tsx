import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth, Dashboard, AdminDashboard, AuditLogs, Settings } from './components';
import { api } from './api';
import type { AuthUser } from './types';

const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

const isAdminRole = (user: AuthUser) => {
  const isAdminFlag = normalizeFlag(user.is_admin);
  const isDevFlag = normalizeFlag(user.is_dev);
  return isAdminFlag || isDevFlag || user.role === 'admin' || user.role === 'dev';
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('authUser');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const refreshUser = async () => {
      if (!user) return;
      try {
        const current = await api.getMe();
        if (current) {
          localStorage.setItem('authUser', JSON.stringify(current));
          setUser(current);
        }
      } catch (error) {
        console.warn('Failed to refresh user:', error);
      }
    };
    refreshUser();
  }, [user?.id]);

  const handleAuth = (nextUser: AuthUser) => {
    localStorage.setItem('authUser', JSON.stringify(nextUser));
    setUser(nextUser);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    setUser(null);
  };

  const handleUserUpdated = (nextUser: AuthUser) => {
    localStorage.setItem('authUser', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
        <Route
          path="/admin"
          element={
            isAdminRole(user) ? (
              <AdminDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/audit"
          element={
            isAdminRole(user) ? (
              <AuditLogs user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={<Settings user={user} onUserUpdated={handleUserUpdated} onLogout={handleLogout} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
