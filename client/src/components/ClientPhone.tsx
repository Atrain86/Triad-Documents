import React from 'react';
import { Phone } from 'lucide-react';

interface ClientPhoneProps {
  phoneNumber: string;
}

export default function ClientPhone({ phoneNumber }: ClientPhoneProps) {
  if (!phoneNumber) {
    return <span className="text-gray-500 italic">No phone number</span>;
  }

  // Clean phone number for tel: (remove spaces, dashes, parentheses)
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

  return (
    <a
      href={`tel:${cleanNumber}`}
      className="flex items-center space-x-2 text-blue-600 hover:underline"
      title={`Call ${phoneNumber}`}
    >
      <Phone size={20} />
      <span>{phoneNumber}</span>
    </a>
  );
}