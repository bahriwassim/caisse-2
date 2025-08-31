"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export interface EnhancedToastProps {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'urgent';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onClose: (id: string) => void;
  playSound?: boolean;
  blink?: boolean;
}

const typeStyles = {
  success: {
    bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    icon: '✅',
    accent: 'bg-green-500',
    text: 'text-green-800 dark:text-green-200',
    sound: 'success'
  },
  error: {
    bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    icon: '❌',
    accent: 'bg-red-500',
    text: 'text-red-800 dark:text-red-200',
    sound: 'error'
  },
  warning: {
    bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    icon: '⚠️',
    accent: 'bg-orange-500',
    text: 'text-orange-800 dark:text-orange-200',
    sound: 'warning'
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'ℹ️',
    accent: 'bg-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
    sound: 'info'
  },
  urgent: {
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
    icon: '🚨',
    accent: 'bg-purple-500',
    text: 'text-purple-800 dark:text-purple-200',
    sound: 'urgent'
  }
};

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function EnhancedToast({ 
  id, 
  title, 
  description, 
  type, 
  duration = 5000, 
  position = 'top-right',
  onClose,
  playSound = true,
  blink = false
}: EnhancedToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(blink);
  const [progress, setProgress] = useState(100);

  const style = typeStyles[type];

  useEffect(() => {
    // Animation d'entrée
    setIsVisible(true);

    // Son de notification
    if (playSound) {
      playNotificationSound(style.sound);
    }

    // Animation de clignotement
    if (blink) {
      const blinkInterval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 300);

      setTimeout(() => {
        clearInterval(blinkInterval);
        setIsBlinking(false);
      }, 2000);
    }

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
  }, [duration, playSound, blink, style.sound]);

  const playNotificationSound = (soundType: string) => {
    try {
      // Utilisation de l'API Web Audio pour créer des sons
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Différentes fréquences selon le type
      const frequencies: { [key: string]: number[] } = {
        success: [523, 659, 784], // Do, Mi, Sol
        error: [349, 277], // Fa, Do# (discord)
        warning: [440, 523], // La, Do
        info: [523], // Do
        urgent: [440, 523, 440, 523] // Alternance La-Do
      };
      
      const freq = frequencies[soundType] || [440];
      
      freq.forEach((frequency, index) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          
          osc.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.frequency.value = frequency;
          osc.type = 'sine';
          
          gain.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + 0.2);
        }, index * 150);
      });
      
    } catch (error) {
      console.log('Audio not supported or blocked');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`fixed ${positionStyles[position]} z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 
        position.includes('right') ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'
      }`}
    >
      <div 
        className={`
          min-w-[300px] max-w-[400px] border-2 rounded-lg shadow-lg relative overflow-hidden
          ${style.bg} ${style.text}
          ${isBlinking ? 'animate-pulse shadow-2xl' : ''}
          transition-all duration-200
        `}
      >
        {/* Barre de progression */}
        <div className="absolute top-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full">
          <div 
            className={`h-full ${style.accent} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Accent latéral */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`} />

        <div className="p-4 pl-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-xl flex-shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{title}</h4>
                <p className="text-xs opacity-90 leading-relaxed">{description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}