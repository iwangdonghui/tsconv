/**
 * Alert Components
 * Alert and AlertDescription components for displaying notifications and messages
 */

import React from 'react';

export interface AlertProps {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
  children: React.ReactNode;
}

export interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const alertVariants = {
  default: 'border-gray-200 bg-gray-50 text-gray-900',
  destructive: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  success: 'border-green-200 bg-green-50 text-green-900',
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  className = '',
  children,
}) => {
  return (
    <div
      role="alert"
      className={`
        relative w-full rounded-lg border p-4
        ${alertVariants[variant]}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  className = '',
  children,
}) => {
  return (
    <div
      className={`
        text-sm leading-relaxed
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
};

export default Alert;
