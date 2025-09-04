"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, CheckCircle, XCircle } from "lucide-react";

export function ImageTestComponent() {
  const [imageStatus, setImageStatus] = useState<'loading' | 'success' | 'error' | null>(null);

  const testImage = () => {
    setImageStatus('loading');
    
    const img = new Image();
    
    img.onload = () => {
      setImageStatus('success');
      console.log('✅ Image JAMAICAN BOWL chargée avec succès');
    };
    
    img.onerror = () => {
      setImageStatus('error');
      console.error('❌ Impossible de charger l\'image JAMAICAN BOWL');
    };
    
    // Tester le chemin de l'image
    img.src = '/images/jamaican-poke-bowl-08-683x1024.jpg';
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={testImage} variant="outline" size="sm">
        <ImageIcon className="h-4 w-4 mr-2" />
        Tester image
      </Button>
      
      {imageStatus === 'loading' && (
        <span className="text-sm text-yellow-600">Chargement...</span>
      )}
      
      {imageStatus === 'success' && (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Image OK</span>
        </div>
      )}
      
      {imageStatus === 'error' && (
        <div className="flex items-center gap-1 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Image introuvable</span>
        </div>
      )}
      
      {imageStatus === 'success' && (
        <div className="ml-4">
          <img 
            src="/images/jamaican-poke-bowl-08-683x1024.jpg" 
            alt="Test JAMAICAN BOWL" 
            className="h-12 w-12 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}