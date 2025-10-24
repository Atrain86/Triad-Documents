import React, { useState } from 'react';

function ClientListHomepage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([
    {
      id: 1,
      name: 'Priya Huffman',
      address: '468 Sutil point rd, Manson\'s landing V0p1k0',
      projectType: 'Exterior',
      roomCount: '1 room'
    },
    {
      id: 2,
      name: 'John Smith',
      address: '123 Main St, Vancouver V6B 2W9',
      projectType: 'Interior',
      roomCount: '3 rooms'
    },
    {
      id: 3,
      name: 'Sarah Johnson',
      address: '456 Oak Ave, Victoria V8W 1P3',
      projectType: 'Both',
      roomCount: '5 rooms'
    }
  ]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SettingsIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  );

  const MapIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );

  return (
    <div 
      className="min-h-screen text-white p-6" 
      style={{ 
        backgroundColor: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <img 
            src="/paint-brain-logo.png" 
            alt="Paint Brain" 
            className="h-12"
          />
          <button className="p-2">
            <SettingsIcon />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute left-5 top-1/2 transform -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl pl-16 pr-6 py-4 text-white text-lg"
            style={{ 
              backgroundColor: '#1a1d29', 
              border: '2px solid #3a3d4a',
              outline: 'none'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button 
            className="flex-1 rounded-2xl px-6 py-4 text-white text-xl font-semibold"
            style={{ backgroundColor: '#22c55e' }}
          >
            + New Client
          </button>
          <button 
            className="rounded-2xl px-6 py-4 text-white text-xl font-semibold flex items-center gap-2"
            style={{ backgroundColor: '#ef4444' }}
          >
            <MapIcon /> Map View
          </button>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="rounded-3xl p-6 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ 
                backgroundColor: '#1a1d29', 
                border: '4px solid #a855f7'
              }}
            >
              <h3 
                className="text-2xl font-semibold mb-3" 
                style={{ color: '#a855f7' }}
              >
                {client.name}
              </h3>
              <p 
                className="text-lg mb-2 font-medium" 
                style={{ color: '#9d8b5a' }}
              >
                {client.address}
              </p>
              <p 
                className="text-base font-medium" 
                style={{ color: '#9d8b5a' }}
              >
                {client.projectType} • {client.roomCount}
              </p>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-xl">No clients found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientListHomepage;
