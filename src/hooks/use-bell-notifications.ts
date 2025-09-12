"use client";

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSoundNotification } from './use-sound-notification';
import type { BellNotification } from '@/lib/types';

export function useBellNotifications(tableId: number) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { playNotification, requestPermission } = useSoundNotification({ 
    volume: 0.9, 
    playback: isEnabled 
  });

  useEffect(() => {
    // Vérifier les préférences utilisateur
    const saved = localStorage.getItem('bell-notifications-enabled');
    if (saved !== null) {
      setIsEnabled(JSON.parse(saved));
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/bell-notifications?table_id=${tableId}&unread_only=true`);
      if (response.ok) {
        const { data } = await response.json();
        setNotifications(data || []);
        setUnreadCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching bell notifications:', error);
    }
  }, [tableId]);

  const markAsRead = useCallback(async (notificationIds?: string[]) => {
    try {
      const response = await fetch('/api/bell-notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: tableId,
          notification_ids: notificationIds
        })
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [tableId, fetchNotifications]);

  const setupRealtimeNotifications = useCallback(() => {
    // Demander la permission audio au premier chargement
    requestPermission();

    const channel = supabase
      .channel(`bell-notifications-table-${tableId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bell_notifications',
        filter: `table_id=eq.${tableId}`
      }, (payload) => {
        const newNotification = payload.new as BellNotification;
        
        if (newNotification && isEnabled) {
          // Ajouter la nouvelle notification à la liste
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Jouer le son de notification
          playNotification('order_ready');
          
          // Notification native du navigateur si permission accordée
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 Sonnerie reçue', {
              body: newNotification.message,
              icon: '/favicon.ico',
              tag: `bell-${newNotification.id}`,
              requireInteraction: true
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, playNotification, requestPermission, isEnabled]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const cleanup = setupRealtimeNotifications();
    return cleanup;
  }, [setupRealtimeNotifications]);

  const toggleEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('bell-notifications-enabled', JSON.stringify(enabled));
  }, []);

  return {
    notifications,
    unreadCount,
    isEnabled,
    fetchNotifications,
    markAsRead,
    toggleEnabled,
    requestPermission
  };
}