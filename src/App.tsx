// App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import routes from './routes';
import { setUserOnline, setUserOffline } from './services/volunteer-service';

const PresenceManager: React.FC = () => {
  const { currentUser } = useAuth();
  useEffect(() => {
    if (!currentUser) return;
    // Set online on mount
    setUserOnline(currentUser.uid);
    // Set offline on unload/tab close
    const handleOffline = () => setUserOffline(currentUser.uid);
    window.addEventListener('beforeunload', handleOffline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') setUserOffline(currentUser.uid);
      if (document.visibilityState === 'visible') setUserOnline(currentUser.uid);
    });
    return () => {
      setUserOffline(currentUser.uid);
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [currentUser]);
  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PresenceManager />
      <Router>
        <Routes>
          {routes.map((route, idx) => (
            <Route key={idx} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;




