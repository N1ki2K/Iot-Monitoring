import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth, Dashboard, AdminDashboard, AuditLogs, Settings, SystemHealth, PasswordChangeRequired } from './components';
import { api } from './api';
import type { AuthUser } from './types';

const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

const isAdminRole = (user: AuthUser) => {
  const isAdminFlag = normalizeFlag(user.is_admin);
  return isAdminFlag || user.role === 'admin';
};

const mergeAuthUser = (nextUser: AuthUser, currentUser: AuthUser | null) => ({
  ...nextUser,
  token: nextUser.token ?? currentUser?.token,
  refreshToken: nextUser.refreshToken ?? currentUser?.refreshToken,
});

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
  const userId = user?.id;

  useEffect(() => {
    const refreshUser = async () => {
      if (!userId) return;
      try {
        const current = await api.getMe();
        if (current) {
          setUser((previous) => {
            const merged = mergeAuthUser(current, previous);
            localStorage.setItem('authUser', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (error) {
        console.warn('Failed to refresh user:', error);
      }
    };
    refreshUser();
  }, [userId]);

  const handleAuth = (nextUser: AuthUser) => {
    const merged = mergeAuthUser(nextUser, user);
    localStorage.setItem('authUser', JSON.stringify(merged));
    setUser(merged);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleLogout = async () => {
    const currentRefreshToken = user?.refreshToken;
    if (currentRefreshToken) {
      try {
        await api.logout(currentRefreshToken);
      } catch (error) {
        console.warn('Failed to revoke refresh token:', error);
      }
    }
    localStorage.removeItem('authUser');
    setUser(null);
  };

  const handleUserUpdated = (nextUser: AuthUser) => {
    const merged = mergeAuthUser(nextUser, user);
    localStorage.setItem('authUser', JSON.stringify(merged));
    setUser(merged);
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  if (normalizeFlag(user.must_change_password)) {
    return (
      <PasswordChangeRequired
        user={user}
        onUserUpdated={handleUserUpdated}
        onLogout={handleLogout}
      />
    );
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
          path="/health"
          element={
            isAdminRole(user) ? (
              <SystemHealth user={user} onLogout={handleLogout} />
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
