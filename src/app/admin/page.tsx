
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <div className="flex items-center justify-center min-h-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full border-2 border-primary/20">
                    <KeyRound className="h-8 w-8 text-primary" />
                </div>
            </div>
          <CardTitle className="text-2xl font-headline">Accès Administrateur</CardTitle>
          <CardDescription>
            Cette zone est restreinte. Accédez aux outils d'administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">La connexion n'est pas requise pour cette démonstration.</p>
          <Button asChild size="lg">
            <Link href="/admin/dashboard">Entrer dans le tableau de bord</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
