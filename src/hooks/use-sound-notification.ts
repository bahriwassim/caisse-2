"use client"

import { useCallback } from 'react';

interface SoundNotificationOptions {
  volume?: number;
  playback?: boolean;
}

export function useSoundNotification(options: SoundNotificationOptions = {}) {
  const { volume = 0.7, playback = true } = options;

  const playNotification = useCallback(async (type: 'new_order' | 'order_update' | 'payment_received' = 'new_order') => {
    if (!playback || typeof window === 'undefined') return;

    try {
      // Create audio context for better mobile support
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create different tones for different notification types
      let frequency1 = 800;
      let frequency2 = 1000;
      let duration = 300;
      
      switch (type) {
        case 'new_order':
          frequency1 = 800;
          frequency2 = 1000;
          duration = 500;
          break;
        case 'order_update':
          frequency1 = 600;
          frequency2 = 800;
          duration = 300;
          break;
        case 'payment_received':
          frequency1 = 1000;
          frequency2 = 1200;
          duration = 200;
          break;
      }

      // Resume audio context if it's suspended (required for mobile)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create oscillators for a pleasant notification sound
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      const gainNode2 = audioContext.createGain();

      // Set up first tone
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      oscillator1.frequency.setValueAtTime(frequency1, audioContext.currentTime);
      oscillator1.type = 'sine';
      
      // Set up second tone (harmonics)
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      oscillator2.frequency.setValueAtTime(frequency2, audioContext.currentTime);
      oscillator2.type = 'sine';

      // Set volume
      gainNode1.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
      gainNode2.gain.setValueAtTime(volume * 0.2, audioContext.currentTime);

      // Create fade in/out envelope
      gainNode1.gain.exponentialRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      gainNode2.gain.exponentialRampToValueAtTime(volume * 0.2, audioContext.currentTime + 0.01);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      // Start and stop oscillators
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + duration / 1000);
      
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + duration / 1000);

      // For repeated notifications (like new orders)
      if (type === 'new_order') {
        setTimeout(() => {
          playNotification('order_update');
        }, duration + 100);
      }

    } catch (error) {
      console.warn('Sound notification failed:', error);
      // Fallback to system beep if available
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [volume, playback]);

  const requestPermission = useCallback(async () => {
    // For mobile Safari, we need user interaction first
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new AudioContext();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        audioContext.close();
        return true;
      } catch (e) {
        console.warn('Audio permission not granted:', e);
        return false;
      }
    }
    return false;
  }, []);

  return {
    playNotification,
    requestPermission
  };
}