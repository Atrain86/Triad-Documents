import React from 'react';
import { 
  Edit as EditIcon, 
  Phone as PhoneIcon, 
  Mail as MailIcon, 
  Trash2 as TrashIcon 
} from 'lucide-react';
import { LucideIconWrapper } from '../components/LucideIconWrapper';
import InvoiceEstimateToggle from '../components/InvoiceEstimateToggle';

const ClientDetail: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans p-4">
      {/* Client Header */}
      <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#6B4C9A] mb-2">Alan Kohl</h1>
            <p className="text-green-500 mb-1">884 Hayes Rd, Mansons Landing, BC V0P1K0</p>
            <p className="text-[#EF6C30]">Exterior • 4 rooms</p>
            <p className="text-green-500 mt-2">In Progress</p>
          </div>
          <div className="flex space-x-3">
            <button className="text-white hover:text-green-500 transition-colors">
              <LucideIconWrapper icon={PhoneIcon} size={24} />
            </button>
            <button className="text-white hover:text-blue-500 transition-colors">
              <LucideIconWrapper icon={MailIcon} size={24} />
            </button>
            <button className="text-white hover:text-[#6B4C9A] transition-colors">
              <LucideIconWrapper icon={EditIcon} size={24} />
            </button>
            <button className="text-white hover:text-red-500 transition-colors">
              <LucideIconWrapper icon={TrashIcon} size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Photos Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-4 flex items-center justify-between border border-[#E03E3E]">
          <div className="flex items-center">
            <span className="mr-4 text-[#E03E3E]">📷</span>
            <span>Photos</span>
          </div>
          <span className="bg-[#E03E3E] text-white px-2 py-1 rounded-full text-xs">2 photos</span>
        </div>

        {/* Tools Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-4 flex items-center justify-between border border-[#F7C11F]">
          <div className="flex items-center">
            <span className="mr-4 text-[#F7C11F]">🔧</span>
            <span>Tools</span>
          </div>
          <span className="bg-[#F7C11F] text-white px-2 py-1 rounded-full text-xs">3 tools</span>
        </div>

        {/* Hours Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-4 flex items-center justify-between border border-green-500">
          <div className="flex items-center">
            <span className="mr-4 text-green-500">📅</span>
            <span>Hours</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">81 hrs</span>
            <span className="text-green-500">$4,860</span>
          </div>
        </div>

        {/* Project Notes Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-4 flex items-center justify-between border border-[#0099CC]">
          <div className="flex items-center">
            <span className="mr-4 text-[#0099CC]">📝</span>
            <span>Project Notes</span>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-4 flex items-center justify-between border border-[#6B4C9A]">
          <div className="flex items-center">
            <span className="mr-4 text-[#6B4C9A]">💰</span>
            <span>Expenses</span>
          </div>
          <span className="bg-[#6B4C9A] text-white px-2 py-1 rounded-full text-xs">4 receipts</span>
        </div>
      </div>

      {/* Drag to re-order text */}
      <div className="text-center text-white/50 mt-4">
        ≡ Drag to re-order
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black flex flex-col items-center space-y-4">
        <InvoiceEstimateToggle />
      </div>
    </div>
  );
};

export default ClientDetail;
