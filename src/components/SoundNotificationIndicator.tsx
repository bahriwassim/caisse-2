"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientSoundNotifications } from "@/hooks/use-client-sound-notifications";

export function SoundNotificationIndicator() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const { playNotification, requestPermission } = useClientSoundNotifications();

  useEffect(() => {
    // Vérifier si les notifications sonores sont activées dans le localStorage
    const saved = localStorage.getItem('client-sound-notifications');
    if (saved !== null) {
      setIsEnabled(JSON.parse(saved));
    }
  }, []);

  const toggleSound = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('client-sound-notifications', JSON.stringify(newState));
    
    if (newState) {
      await requestPermission();
      // Test du son
      playNotification('info');
    }
  };

  const testSound = () => {
    playNotification('new_order');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSound}
          className={`${isEnabled ? 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-800'}`}
        >
          {isEnabled ? (
            <>
              <Volume2 className="h-4 w-4 mr-2" />
              Sons activés
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 mr-2" />
              Sons désactivés
            </>
          )}
        </Button>
        
        {isEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={testSound}
            className="text-xs"
          >
            <Bell className="h-3 w-3 mr-1" />
            Test
          </Button>
        )}
      </div>
    </div>
  );
}
