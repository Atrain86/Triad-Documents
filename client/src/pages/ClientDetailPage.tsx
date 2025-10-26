import React, { useState } from 'react';
import { ReactSortable } from 'react-sortablejs';

const BRAND_COLORS = {
  red: '#E03E3E',
  orange: '#EF6C30',
  yellow: '#F7C11F',
  blue: '#0099CC',
  purple: '#6B4C9A',
  background: '#000000',
  foreground: '#FFFFFF',
  redHover: 'rgba(224, 62, 62, 0.9)',
  orangeHover: 'rgba(239, 108, 48, 0.9)',
  yellowHover: 'rgba(247, 193, 31, 0.9)',
  blueHover: 'rgba(0, 153, 204, 0.9)',
  purpleHover: 'rgba(107, 76, 154, 0.9)'
};

const ClientDetailPage: React.FC = () => {
  const [sections, setSections] = useState([
    { 
      id: 1, 
      name: 'Photos', 
      icon: '📷', 
      count: 2, 
      color: BRAND_COLORS.red,
      borderColor: 'border-[#E03E3E]',
      textColor: 'text-[#E03E3E]'
    },
    { 
      id: 2, 
      name: 'Tools', 
      icon: '🔧', 
      count: 3, 
      color: BRAND_COLORS.yellow,
      borderColor: 'border-[#F7C11F]',
      textColor: 'text-[#F7C11F]'
    },
    { 
      id: 3, 
      name: 'Hours', 
      icon: '📅', 
      count: 81, 
      amount: 4860, 
      color: BRAND_COLORS.blue,
      borderColor: 'border-[#0099CC]',
      textColor: 'text-[#0099CC]'
    },
    { 
      id: 4, 
      name: 'Project Notes', 
      icon: '📝', 
      color: BRAND_COLORS.blue,
      borderColor: 'border-[#0099CC]',
      textColor: 'text-[#0099CC]'
    },
    { 
      id: 5, 
      name: 'Expenses', 
      icon: '💰', 
      count: 4, 
      color: BRAND_COLORS.purple,
      borderColor: 'border-[#6B4C9A]',
      textColor: 'text-[#6B4C9A]'
    }
  ]);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Client Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 m-4 mb-6 border-[#6B4C9A]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#6B4C9A] mb-2">Alan Kohl</h1>
            <p className="text-green-500 mb-1">884 Hayes Rd, Mansons Landing V0P1K0</p>
            <p className="text-[#EF6C30]">Exterior • 4 rooms</p>
          </div>
          <div className="flex space-x-3">
            <button className="text-[#0099CC] hover:opacity-80">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </button>
            <button className="text-[#6B4C9A] hover:opacity-80">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </button>
            <button className="text-[#E03E3E] hover:opacity-80">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Sortable Sections */}
      <ReactSortable 
        list={sections} 
        setList={setSections} 
        handle=".drag-handle"
        className="space-y-4 px-4 mb-24"
      >
        {sections.map(section => (
          <div 
            key={section.id} 
            className={`bg-[#1A1A1A] border ${section.borderColor} rounded-xl p-4 flex items-center`}
          >
            <div className="drag-handle mr-4 opacity-50 cursor-move text-white/50">≡</div>
            <div className={`mr-4 ${section.textColor}`}>{section.icon}</div>
            <div className="flex-grow flex items-center justify-between">
              <span className="font-semibold">{section.name}</span>
              {section.count !== undefined && (
                <span 
                  className="text-sm px-2 py-1 rounded-full"
                  style={{ 
                    backgroundColor: `${section.color}30`, 
                    color: section.color 
                  }}
                >
                  {section.count} {section.name}
                </span>
              )}
              {section.amount !== undefined && (
                <span className="text-white/60 text-sm">
                  ${section.amount}
                </span>
              )}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </div>
        ))}
      </ReactSortable>

      <div className="text-center text-white/50 mb-4">
        ≡ Drag to re-order
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black flex space-x-4 justify-center">
        <div className="flex space-x-4">
          <button 
            className="bg-[#6B4C9A] text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:bg-[rgba(107,76,154,0.9)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F7C11F]"
            aria-label="Create Invoice"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Invoice</span>
          </button>
          <button 
            className="bg-[#6B4C9A] text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:bg-[rgba(107,76,154,0.9)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F7C11F]"
            aria-label="Create Estimate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Estimate</span>
          </button>
        </div>
        <button 
          className="bg-[#6B4C9A] text-white px-6 py-3 rounded-xl hover:bg-[rgba(107,76,154,0.9)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F7C11F]"
          aria-label="Generate"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default ClientDetailPage;
