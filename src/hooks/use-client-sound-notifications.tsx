"use client";

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSoundNotification } from './use-sound-notification';

export function useClientSoundNotifications() {
  const [isEnabled, setIsEnabled] = useState(true);
  
  const { playNotification, requestPermission } = useSoundNotification({ 
    volume: 0.8, 
    playback: isEnabled 
  });

  useEffect(() => {
    // Vérifier les préférences utilisateur
    const saved = localStorage.getItem('client-sound-notifications');
    if (saved !== null) {
      setIsEnabled(JSON.parse(saved));
    }
  }, []);

  const setupRealtimeNotifications = useCallback(() => {
    // Demander la permission audio au premier chargement
    requestPermission();

    const channel = supabase
      .channel('client-sound-notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        const event = payload.eventType;
        const newRec = payload.new as any;
        const oldRec = payload.old as any;

        // Notification pour nouvelle commande
        if (event === 'INSERT' && newRec && isEnabled) {
          playNotification('new_order');
        }

        // Notification pour mise à jour de commande
        if (event === 'UPDATE' && newRec && oldRec && isEnabled) {
          if (oldRec.status !== newRec.status) {
            switch (newRec.status) {
              case 'in_preparation':
                playNotification('order_update');
                break;
              case 'ready_for_delivery':
                playNotification('order_ready');
                break;
              case 'delivered':
                playNotification('payment_received');
                break;
              case 'cancelled':
                playNotification('order_update');
                break;
              default:
                playNotification('order_update');
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNotification, requestPermission]);

  useEffect(() => {
    const cleanup = setupRealtimeNotifications();
    return cleanup;
  }, [setupRealtimeNotifications, isEnabled]);

  return {
    playNotification,
    requestPermission
  };
}
