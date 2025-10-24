import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Lazy-loaded main pages
const DesignPreviewLayout = React.lazy(() => import('./pages/DesignPreview'));

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Existing routes */}
          <Route path="/design-preview/*" element={<DesignPreviewLayout />} />
          {/* Add other routes as needed */}
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
