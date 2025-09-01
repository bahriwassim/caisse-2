"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useActiveOrdersCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Fonction pour récupérer le nombre de commandes actives
    const fetchActiveOrdersCount = async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['awaiting_payment', 'in_preparation']);

      if (!error && count !== null) {
        setCount(count);
      }
    };

    // Récupération initiale
    fetchActiveOrdersCount();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('active-orders-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Rafraîchir le count à chaque changement
        fetchActiveOrdersCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}