import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Define brand color constants for consistency
const BRAND_COLORS = {
  red: '#E03E3E',
  orange: '#EF6C30',
  yellow: '#F7C11F',
  blue: '#0099CC',
  purple: '#6B4C9A',
  background: '#000000',
  foreground: '#FFFFFF'
};

// Temporary mock data - replace with actual data fetching
const mockClients = [
  {
    id: 1,
    name: 'Alan Kohl',
    streetAddress: '884 Hayes Rd',
    cityProvince: 'Mansons Landing, BC',
    postalCode: 'V0P1K0',
    type: 'Exterior',
    status: 'In Progress',
    rooms: 0,
    lastUpdated: '2025-10-25',
    progressColor: '#0099CC',
    tags: ['Active', 'Urgent']
  },
  {
    id: 2,
    name: 'Klahoose First Nation #1',
    streetAddress: '1743A Torx Rd',
    cityProvince: 'Squirrel Cove, BC',
    postalCode: 'V0P1T0',
    type: 'Interior',
    status: 'In Progress',
    rooms: 5,
    lastUpdated: '2025-10-24',
    progressColor: '#6B4C9A',
    tags: ['Pending']
  },
  {
    id: 3,
    name: 'GaiaTree Construction',
    streetAddress: '1662 Bobcat',
    cityProvince: 'Location Unknown',
    postalCode: '',
    type: 'Interior',
    status: 'Initial Contact',
    rooms: 0,
    lastUpdated: '2025-10-20',
    progressColor: '#EF6C30',
    tags: ['New']
  },
  {
    id: 4,
    name: 'Thomas Behm',
    streetAddress: '404 Whaletown Rd',
    cityProvince: 'Whaletown, BC',
    postalCode: '',
    type: 'Interior',
    status: 'Initial Contact',
    rooms: 0,
    lastUpdated: '2025-10-22',
    progressColor: '#E03E3E',
    tags: ['Urgent']
  },
  {
    id: 5,
    name: 'Cortes Housing Society',
    streetAddress: '965 Beasley P.O. Box 517',
    cityProvince: 'Manson\'s Landing, BC',
    postalCode: '',
    type: 'Interior',
    status: 'Initial Contact',
    rooms: 0,
    lastUpdated: '2025-10-21',
    progressColor: '#F7C11F',
    tags: ['Potential']
  },
  {
    id: 6,
    name: 'FRED WARD',
    streetAddress: '1823 Cedar Lane',
    cityProvince: 'Whaletown, BC',
    postalCode: 'V0P1K0',
    type: 'Interior',
    status: 'Initial Contact',
    rooms: 4,
    lastUpdated: '2025-10-23',
    progressColor: '#0099CC',
    tags: ['Follow-up']
  }
];

const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(true);

  const filteredClients = mockClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

const statusColorMap: Record<string, string> = {
  'In Progress': `bg-[${BRAND_COLORS.blue}]`,
  'Initial Contact': `bg-[${BRAND_COLORS.orange}]`,
  'Awaiting Confirmation': `bg-[${BRAND_COLORS.yellow}]`
};

  return (
    <div className="min-h-screen bg-black p-4 text-white font-sans antialiased">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8 -mt-2">
          <img 
            src="/paint-brain-logo.png" 
            alt="Paint Brain Logo" 
            className="h-48 w-auto transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-6">
          <button 
            className="bg-[#E03E3E] text-white px-6 py-3 rounded-xl hover:bg-[#E03E3E]/90 transition-colors duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F7C11F]"
          >
            New Client
          </button>
          <button 
            className="bg-[#6B4C9A] text-white px-6 py-3 rounded-xl hover:bg-[#6B4C9A]/90 transition-colors duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F7C11F]"
          >
            Schedule
          </button>
        </div>

        {/* Active/Archive Toggle */}
        <div className="flex justify-center items-center space-x-4 mb-6">
          <span className="text-[#0099CC] font-semibold">9 Active</span>
          <label className="inline-flex relative items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={!activeTab}
              onChange={() => setActiveTab(!activeTab)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#6B4C9A] transition-colors duration-300 
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
              after:bg-white after:border-gray-300 after:border after:rounded-full 
              after:h-5 after:w-5 after:transition-all 
              peer-checked:after:translate-x-full"></div>
            <span className="ml-3 text-[#6B4C9A] font-semibold">4 Archive</span>
          </label>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Search clients" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-[#EF6C30] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F7C11F] focus:ring-2 focus:ring-[#F7C11F]/30 transition-all duration-300"
          />
        </div>

        {/* Client List */}
        <div className="space-y-4">
          {filteredClients.map(client => (
            <div 
              key={client.id} 
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group cursor-pointer relative"
            >
              {/* Progress Indicator */}
              <div 
                className="absolute top-2 right-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: client.progressColor }}
                title={`Project Status: ${client.status}`}
              ></div>

              {/* Removed project tags as per feedback */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[#6B4C9A] font-bold text-xl mb-1">{client.name}</h3>
<div className="flex space-x-3">
  <button className="text-[#E03E3E] hover:opacity-80 transition-opacity duration-300">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  </button>
  <button className="text-[#6B4C9A] hover:opacity-80 transition-opacity duration-300">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  </button>
  <button className="text-[#0099CC] hover:opacity-80 transition-opacity duration-300">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
  </button>
  <button className="text-[#E03E3E] hover:opacity-80 transition-opacity duration-300">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  </button>
</div>
              </div>
              <div className="text-green-500 text-sm space-y-1 mb-2">
  <p>{client.streetAddress}</p>
  <p>{client.cityProvince}</p>
  <p>{client.postalCode}</p>
</div>
<div className="border-b border-[#F7C11F] w-full my-2"></div>
              <div className="flex justify-between items-center text-sm mt-4">
                <div className="flex flex-col">
                  <span className="text-[#EF6C30] font-medium">{client.type}</span>
                  <span className="text-white/60 text-xs">{client.lastUpdated}</span>
                </div>
                <div className="flex items-center text-green-500 group-hover:text-[#F7C11F] transition-colors">
                  <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                  In Progress
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
