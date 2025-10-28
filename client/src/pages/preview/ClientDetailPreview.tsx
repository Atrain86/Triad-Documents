import React from 'react';
import ClientDetail from '../ClientDetail';

const ClientDetailPreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">Client Detail Component Preview</h1>
      <div style={{ display: "flex", gap: "2rem" }}>
        <div style={{ flex: 1 }}>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">Live Component</h2>
            <ClientDetail />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">Reference Screenshot</h2>
            <img
              src="/screenshots/clientdetails_components/clientdetailpage_full.jpg"
              alt="Client Detail Reference"
              style={{ width: "100%", border: "1px solid #ccc" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPreview;
