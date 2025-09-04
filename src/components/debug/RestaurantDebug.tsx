"use client"

import { useRestaurantDetails } from "@/hooks/use-restaurant-details";

export function RestaurantDebug() {
  const { details, isLoading } = useRestaurantDetails();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-2 bg-black text-white text-xs rounded max-w-sm z-50">
      <h4>Debug Restaurant:</h4>
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Has details: {details ? 'Yes' : 'No'}</p>
      <p>Has logo: {details?.logo ? 'Yes' : 'No'}</p>
      <p>Name: {details?.name || 'None'}</p>
      {details?.logo && (
        <img 
          src={details.logo} 
          alt="Logo debug" 
          className="h-8 w-auto mt-1"
        />
      )}
    </div>
  );
}