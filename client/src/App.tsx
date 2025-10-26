import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Lazy-loaded main pages
const DesignPreviewLayout = React.lazy(() => import('./pages/DesignPreview'));
const Dashboard = React.lazy(() => import('./pages/dashboard'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ProjectDetail = React.lazy(() => import('./pages/project-detail'));
const ClientDetail = React.lazy(() => import('./pages/ClientDetail'));
const NotFound = React.lazy(() => import('./pages/not-found'));

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/design-preview/*" element={<DesignPreviewLayout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/project-detail" element={<ProjectDetail />} />
          <Route path="/client-detail" element={<ClientDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
