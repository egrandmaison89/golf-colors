import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
  fullText: string;
}

export function TabButton({ active, onClick, icon, text, fullText }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors shadow hover:shadow-md ${
        active
          ? 'bg-green-600 text-white shadow-lg'
          : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{fullText}</span>
      <span className="md:hidden">{text}</span>
    </button>
  );
}