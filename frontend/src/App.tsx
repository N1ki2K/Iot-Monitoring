import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth, Dashboard, AdminDashboard } from './components';
import type { AuthUser } from './types';

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

  const handleAuth = (nextUser: AuthUser) => {
    localStorage.setItem('authUser', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    setUser(null);
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
            user.is_admin === 1 ? (
              <AdminDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
