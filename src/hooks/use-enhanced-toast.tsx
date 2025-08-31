"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { EnhancedToast, EnhancedToastProps } from "@/components/ui/enhanced-toast";

interface Toast extends Omit<EnhancedToastProps, 'onClose'> {
  id: string;
}

interface EnhancedToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, description: string, options?: Partial<Toast>) => void;
  error: (title: string, description: string, options?: Partial<Toast>) => void;
  warning: (title: string, description: string, options?: Partial<Toast>) => void;
  info: (title: string, description: string, options?: Partial<Toast>) => void;
  urgent: (title: string, description: string, options?: Partial<Toast>) => void;
}

const EnhancedToastContext = createContext<EnhancedToastContextType | undefined>(undefined);

export function EnhancedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description: string, options?: Partial<Toast>) => {
    addToast({ 
      title, 
      description, 
      type: 'success', 
      playSound: true,
      blink: false,
      ...options 
    });
  }, [addToast]);

  const error = useCallback((title: string, description: string, options?: Partial<Toast>) => {
    addToast({ 
      title, 
      description, 
      type: 'error', 
      playSound: true,
      blink: true,
      duration: 8000,
      ...options 
    });
  }, [addToast]);

  const warning = useCallback((title: string, description: string, options?: Partial<Toast>) => {
    addToast({ 
      title, 
      description, 
      type: 'warning', 
      playSound: true,
      blink: true,
      duration: 6000,
      ...options 
    });
  }, [addToast]);

  const info = useCallback((title: string, description: string, options?: Partial<Toast>) => {
    addToast({ 
      title, 
      description, 
      type: 'info', 
      playSound: false,
      blink: false,
      ...options 
    });
  }, [addToast]);

  const urgent = useCallback((title: string, description: string, options?: Partial<Toast>) => {
    addToast({ 
      title, 
      description, 
      type: 'urgent', 
      playSound: true,
      blink: true,
      duration: 10000,
      ...options 
    });
  }, [addToast]);

  return (
    <EnhancedToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info,
      urgent
    }}>
      {children}
      {toasts.map(toast => (
        <EnhancedToast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </EnhancedToastContext.Provider>
  );
}

export function useEnhancedToast() {
  const context = useContext(EnhancedToastContext);
  if (context === undefined) {
    throw new Error('useEnhancedToast must be used within an EnhancedToastProvider');
  }
  return context;
}