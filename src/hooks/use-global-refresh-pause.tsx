"use client"

import { useState, useEffect, useCallback } from 'react';

const REFRESH_PAUSE_KEY = 'caisse_global_refresh_paused';

/**
 * Hook pour gérer la pause d'auto-refresh globale entre tous les onglets de l'admin.
 * Utilise localStorage pour synchroniser l'état entre les onglets.
 */
export function useGlobalRefreshPause() {
  const [isPaused, setIsPaused] = useState(false);

  // Fonction pour lire l'état depuis localStorage
  const readPauseState = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(REFRESH_PAUSE_KEY);
    return stored === 'true';
  }, []);

  // Fonction pour mettre à jour l'état dans localStorage
  const setPauseState = useCallback((paused: boolean) => {
    if (typeof window === 'undefined') return;
    
    if (paused) {
      localStorage.setItem(REFRESH_PAUSE_KEY, 'true');
    } else {
      localStorage.removeItem(REFRESH_PAUSE_KEY);
    }
    
    setIsPaused(paused);
    
    // Déclencher un événement pour notifier les autres onglets
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Écouter les changements de localStorage (pour sync entre onglets)
  useEffect(() => {
    // Lire l'état initial
    setIsPaused(readPauseState());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === REFRESH_PAUSE_KEY) {
        setIsPaused(readPauseState());
      }
    };

    const handleCustomStorageEvent = () => {
      setIsPaused(readPauseState());
    };

    // Écouter les changements depuis d'autres onglets
    window.addEventListener('storage', handleStorageChange);
    // Écouter les changements depuis le même onglet
    window.addEventListener('storage', handleCustomStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage', handleCustomStorageEvent);
    };
  }, [readPauseState]);

  return {
    isPaused,
    pauseRefresh: () => setPauseState(true),
    resumeRefresh: () => setPauseState(false),
    setPauseState
  };
}

/**
 * Hook pour les composants qui ont besoin de mettre en pause/reprendre l'auto-refresh
 * de manière conditionnelle (comme les modales)
 */
export function useConditionalRefreshPause() {
  const { isPaused, pauseRefresh, resumeRefresh } = useGlobalRefreshPause();

  // Créer des références stables pour éviter les re-rendus
  const stablePauseRefresh = useCallback(() => pauseRefresh(), [pauseRefresh]);
  const stableResumeRefresh = useCallback(() => resumeRefresh(), [resumeRefresh]);

  const pauseWhileActive = useCallback((isActive: boolean) => {
    console.log('pauseWhileActive called with:', isActive);
    if (isActive) {
      stablePauseRefresh();
    } else {
      stableResumeRefresh();
    }
  }, [stablePauseRefresh, stableResumeRefresh]);

  return {
    isPaused,
    pauseWhileActive
  };
}