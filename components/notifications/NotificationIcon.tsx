'use client';

import React from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { NotificationType } from '../../types/notification';

// Import custom SVG components (same as in notifications page)
const Users = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
};

const UserPlus = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
};

const Settings = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
};

interface NotificationIconProps {
  type: NotificationType;
  size?: 'sm' | 'md' | 'lg';
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({ 
  type, 
  size = 'md' 
}) => {
  // Determine size class
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  const iconSize = sizeClasses[size];
  
  // Background and text colors based on notification type
  const getIconStyles = () => {
    switch (type) {
      case 'payment':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-600'
        };
      case 'transaction':
        return {
          bg: 'bg-green-100',
          text: 'text-green-600'
        };
      case 'pool':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-600'
        };
      case 'invite':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-600'
        };
      case 'alert':
        return {
          bg: 'bg-red-100',
          text: 'text-red-600'
        };
      case 'system':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600'
        };
    }
  };
  
  const { bg, text } = getIconStyles();
  
  // Render the appropriate icon based on notification type
  const renderIcon = () => {
    switch (type) {
      case 'payment':
        return <Bell className={`${iconSize} ${text}`} />;
      case 'transaction':
        return <CheckCircle2 className={`${iconSize} ${text}`} />;
      case 'pool':
        return <Users className={`${iconSize} ${text}`} />;
      case 'invite':
        return <UserPlus className={`${iconSize} ${text}`} />;
      case 'alert':
        return <AlertCircle className={`${iconSize} ${text}`} />;
      case 'system':
        return <Settings className={`${iconSize} ${text}`} />;
      default:
        return <Bell className={`${iconSize} ${text}`} />;
    }
  };
  
  return (
    <div className={`rounded-full ${bg} p-2`}>
      {renderIcon()}
    </div>
  );
};