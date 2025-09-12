"use client";

import { useClientSoundNotifications } from "@/hooks/use-client-sound-notifications";
import { SoundNotificationIndicator } from "@/components/SoundNotificationIndicator";

interface ClientSoundWrapperProps {
  children: React.ReactNode;
}

export function ClientSoundWrapper({ children }: ClientSoundWrapperProps) {
  // Activer les notifications sonores côté client
  useClientSoundNotifications();

  return (
    <>
      {children}
      <SoundNotificationIndicator />
    </>
  );
}
