import React from 'react';

interface FormErrorMessageProps {
  children: React.ReactNode;
  className?: string;
}

export const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ children, className = '' }) => {
  if (!children) return null;
  return (
    <span className={`flex items-center text-left text-red-500 text-xs mt-1 ${className}`} role="alert">
      {children}
    </span>
  );
}; 