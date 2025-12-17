import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold font-mono uppercase tracking-wider transition-all duration-150 border-2 border-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
  
  const variants = {
    primary: "bg-[#FF4D00] text-white shadow-[4px_4px_0px_0px_#000000] hover:bg-[#FF6A2B]",
    outline: "bg-white text-black shadow-[4px_4px_0px_0px_#000000] hover:bg-gray-50",
    ghost: "bg-transparent border-transparent shadow-none hover:bg-black/5 text-black hover:underline",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  // Override shadow for ghost to keep layout but remove visual weight
  const finalClassName = variant === 'ghost' 
    ? `${baseStyles.replace('border-2 border-black', '')} ${variants.ghost} ${sizes[size]} ${className}`
    : `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button 
      className={finalClassName}
      {...props}
    >
      {children}
    </button>
  );
};