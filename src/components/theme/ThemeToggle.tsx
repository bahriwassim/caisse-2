"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 transition-colors duration-300">
      {/* Mode Jour */}
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          theme === "light" 
            ? "bg-white text-gray-900 shadow-sm" 
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <Sun className="h-4 w-4" />
        Mode Jour
      </button>
      
      {/* Mode Nuit */}
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          theme === "dark" 
            ? "bg-gray-900 text-white shadow-sm" 
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <Moon className="h-4 w-4" />
        Mode Nuit
      </button>
    </div>
  );
}

// Simple mobile-friendly toggle button
export function MobileThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Éviter l'erreur d'hydration en ne rendant qu'après le montage côté client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Rendu neutre pendant l'hydration pour éviter les différences
    return (
      <div className="relative inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 transition-colors duration-300">
        <button className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 text-gray-600">
          <Sun className="h-3 w-3" />
          Jour
        </button>
        <button className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 text-gray-600">
          <Moon className="h-3 w-3" />
          Nuit
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 transition-colors duration-300">
      {/* Mode Jour */}
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          theme === "light" 
            ? "bg-white text-gray-900 shadow-sm" 
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <Sun className="h-3 w-3" />
        Jour
      </button>
      
      {/* Mode Nuit */}
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          theme === "dark" 
            ? "bg-gray-900 text-white shadow-sm" 
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <Moon className="h-3 w-3" />
        Nuit
      </button>
    </div>
  );
}