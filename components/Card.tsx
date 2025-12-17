import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean; // Kept for API compatibility but ignored in this design system
  variant?: 'default' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default' }) => {
  const baseStyles = "bg-white border-2 border-black p-6 relative";
  
  const shadowStyle = variant === 'default' 
    ? "shadow-[8px_8px_0px_0px_#000000]" 
    : "";

  return (
    <div className={`${baseStyles} ${shadowStyle} ${className}`}>
      {children}
    </div>
  );
};