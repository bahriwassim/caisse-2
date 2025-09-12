"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Download, FileText, Table } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ExportNotificationProps {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'warning' | 'info';
  format?: 'pdf' | 'csv';
  duration?: number;
  onClose: (id: string) => void;
}

const typeStyles = {
  success: {
    bg: 'bg-green-50 border-green-200 dark:bg-green-800/90 dark:border-green-600',
    icon: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />,
    accent: 'bg-green-500 dark:bg-green-600',
    text: 'text-green-800 dark:text-green-50',
    glow: 'shadow-green-500/20 dark:shadow-green-600/30'
  },
  error: {
    bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    icon: <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    accent: 'bg-red-500',
    text: 'text-red-800 dark:text-red-200',
    glow: 'shadow-red-500/20'
  },
  warning: {
    bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    icon: <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
    accent: 'bg-orange-500',
    text: 'text-orange-800 dark:text-orange-200',
    glow: 'shadow-orange-500/20'
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    accent: 'bg-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
    glow: 'shadow-blue-500/20'
  }
};

const formatIcons = {
  pdf: <FileText className="h-4 w-4" />,
  csv: <Table className="h-4 w-4" />
};

export function ExportNotification({ 
  id, 
  title, 
  description, 
  type, 
  format,
  duration = 5000, 
  onClose 
}: ExportNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const style = typeStyles[type];

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
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 mb-3 ${
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
    >
      <div 
        className={`
          ${style.bg} ${style.text} rounded-lg shadow-lg ${style.glow}
          min-w-[320px] max-w-[400px] relative overflow-hidden
          border-l-4 border-white/30 dark:border-white/20
        `}
      >
        {/* Barre de progression */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/20 dark:bg-white/10 w-full">
          <div 
            className={`h-full ${style.accent} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                {style.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{title}</h4>
                  {format && (
                    <div className="flex items-center gap-1 text-xs opacity-75">
                      {formatIcons[format]}
                      <span>{format.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs opacity-90 leading-relaxed">{description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-white/20 dark:hover:bg-white/10 text-current hover:text-current"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
