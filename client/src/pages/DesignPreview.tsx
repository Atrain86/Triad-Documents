import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ClientDetail from './ClientDetail';  // Import ClientDetail component

// Lazy load design components
const LoginDesign = lazy(() => import('../../design/components/LoginPage.jsx'));
const ClientListHomepage = lazy(() => import('../../design/components/ClientListHomepage.jsx'));
const DashboardDesign = lazy(() => import('../../design/components/DashboardDesign.tsx'));

const DesignPreviewLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <nav className="mb-8 bg-white shadow-md rounded-lg p-4">
        <h1 className="text-2xl font-bold mb-4">Design Preview</h1>
        <div className="flex space-x-4">
          <Link 
            to="/design-preview/login" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Login Page
          </Link>
          <Link 
            to="/design-preview/client-list" 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Client List
          </Link>
          <Link 
            to="/design-preview/dashboard" 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Dashboard
          </Link>
          <Link
            to="/design-preview/client-detail"
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Client Detail
          </Link>
        </div>
      </nav>

      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="login" element={
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Login Page Preview</h2>
              <LoginDesign />
            </div>
          } />
          <Route path="client-list" element={
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Client List Preview</h2>
              <ClientListHomepage />
            </div>
          } />
          <Route path="dashboard" element={
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Dashboard Preview</h2>
              <DashboardDesign />
            </div>
          } />
          <Route path="client-detail" element={
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Client Detail Preview</h2>
              <ClientDetail />
            </div>
          } />
        </Routes>
      </Suspense>
    </div>
  );
};

export default DesignPreviewLayout;
