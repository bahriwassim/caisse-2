import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnhancedToastProvider } from "@/hooks/use-enhanced-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caisse Events Lite",
  description: "Menu numérique et système de commande pour les événements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <EnhancedToastProvider>
            {children}
          </EnhancedToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
