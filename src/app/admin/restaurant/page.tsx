"use client";

import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import RestaurantInfoForm from "@/components/admin/RestaurantInfoForm";

export default function RestaurantPage() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between sm:block">
        <h1 className="font-headline text-xl sm:text-2xl">Paramètres du Restaurant</h1>
        <MobileThemeToggle />
      </div>
      <RestaurantInfoForm />
    </div>
  );
}