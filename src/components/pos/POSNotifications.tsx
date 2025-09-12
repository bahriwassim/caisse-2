"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface POSNotification {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
  duration?: number;
  icon?: React.ReactNode;
}

interface POSNotificationsProps {
  notifications: POSNotification[];
  onClose: (id: string) => void;
}

const typeStyles = {
  success: {
    bg: 'bg-green-500 dark:bg-green-700',
    text: 'text-white',
    icon: <CheckCircle className="h-5 w-5" />,
    glow: 'shadow-green-500/50 dark:shadow-green-700/50'
  },
  warning: {
    bg: 'bg-orange-500 dark:bg-orange-700',
    text: 'text-white',
    icon: <AlertTriangle className="h-5 w-5" />,
    glow: 'shadow-orange-500/50 dark:shadow-orange-700/50'
  },
  info: {
    bg: 'bg-blue-500 dark:bg-blue-700',
    text: 'text-white',
    icon: <Info className="h-5 w-5" />,
    glow: 'shadow-blue-500/50 dark:shadow-blue-700/50'
  }
};

function POSNotificationItem({ 
  notification, 
  onClose 
}: { 
  notification: POSNotification; 
  onClose: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const style = typeStyles[notification.type];
  const duration = notification.duration || 5000;

  useEffect(() => {
    // Animation d'entrée
    setIsVisible(true);

    // Barre de progression
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    // Auto-fermeture
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 mb-3 ${
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
    >
      <div 
        className={`
          ${style.bg} ${style.text} rounded-r-lg shadow-lg ${style.glow}
          min-w-[280px] max-w-[350px] relative overflow-hidden
          border-l-4 border-white/30
        `}
      >
        {/* Barre de progression */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
          <div 
            className="h-full bg-white/60 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                {notification.icon || style.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                <p className="text-xs opacity-90 leading-relaxed">{notification.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-white/20 text-white/80 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function POSNotifications({ notifications, onClose }: POSNotificationsProps) {
  return (
    <div className="fixed left-4 top-4 z-50 pointer-events-none">
      <div className="space-y-0 pointer-events-auto">
        {notifications.map(notification => (
          <POSNotificationItem
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}