"use client";

import { useState, useCallback } from "react";
import { ExportNotification, type ExportNotificationProps } from "@/components/ui/export-notification";

export interface ExportNotificationData {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'warning' | 'info';
  format?: 'pdf' | 'csv';
  duration?: number;
}

export function useExportNotifications() {
  const [notifications, setNotifications] = useState<ExportNotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<ExportNotificationData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: ExportNotificationData = {
      ...notification,
      id
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, description: string, format?: 'pdf' | 'csv') => {
    addNotification({
      title,
      description,
      type: 'success',
      format,
      duration: 4000
    });
  }, [addNotification]);

  const showError = useCallback((title: string, description: string) => {
    addNotification({
      title,
      description,
      type: 'error',
      duration: 6000
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, description: string, format?: 'pdf' | 'csv') => {
    addNotification({
      title,
      description,
      type: 'info',
      format,
      duration: 3000
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, description: string) => {
    addNotification({
      title,
      description,
      type: 'warning',
      duration: 5000
    });
  }, [addNotification]);

  const NotificationContainer = () => (
    <div className="fixed left-4 top-4 z-50 pointer-events-none">
      <div className="space-y-0 pointer-events-auto">
        {notifications.map(notification => (
          <ExportNotification
            key={notification.id}
            {...notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    NotificationContainer
  };
}
