// App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import routes from './routes';

const App: React.FC = () => {
  return (
    <AuthProvider>
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




