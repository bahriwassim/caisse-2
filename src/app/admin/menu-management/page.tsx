
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, FilePenLine, Trash2, Loader2 } from "lucide-react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import MenuItemForm from "@/components/admin/MenuItemForm";
import type { MenuItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { seedDatabaseIfNeeded } from "@/lib/services/menuService";
import { UpdateJamaicanBowlButton } from "@/components/admin/UpdateJamaicanBowlButton";
import { ResetMenuButton } from "@/components/admin/ResetMenuButton";
import { ImageTestComponent } from "@/components/admin/ImageTestComponent";


export default function MenuManagementPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const { toast } = useToast();

    const fetchMenuItems = async () => {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('category')
            .order('name');
        
        if (error) {
            console.error("Error fetching menu items:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de charger le menu.",
            });
        } else {
            setMenuItems(data);
        }
        setLoading(false);
    }

    useEffect(() => {
        const initializeMenu = async () => {
            await seedDatabaseIfNeeded();
            fetchMenuItems();
        };
        initializeMenu();

        const channel = supabase.channel('realtime-menu')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
            fetchMenuItems();
          })
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [toast]);

    const handleAddItem = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    const handleEditItem = (item: MenuItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };
    
    const handleDeleteItem = async (id: string) => {
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) {
            console.error("Error deleting item:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "La suppression du plat a échoué.",
            });
        } else {
            toast({
                title: "Plat supprimé",
                description: "Le plat a été supprimé avec succès.",
            });
        }
    };

    const handleFormSubmit = async (data: Omit<MenuItem, 'id' | 'created_at'>) => {
        try {
            if (editingItem) {
                const { error } = await supabase
                    .from('menu_items')
                    .update(data)
                    .eq('id', editingItem.id);
                if (error) throw error;
                 toast({
                    title: "Plat modifié",
                    description: "Les informations du plat ont été mises à jour.",
                });
            } else {
                const { error } = await supabase.from('menu_items').insert(data);
                 if (error) throw error;
                toast({
                    title: "Plat ajouté",
                    description: "Le nouveau plat a été ajouté au menu.",
                });
            }
            setIsFormOpen(false);
            setEditingItem(null);
        } catch (error) {
            console.error("Error saving item:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "L'enregistrement du plat a échoué.",
            });
        }
    };


  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                  <div className="flex items-center justify-between sm:block">
                    <CardTitle className="font-headline text-xl sm:text-2xl">Gestion du Menu</CardTitle>
                    <MobileThemeToggle />
                  </div>
                  <CardDescription className="text-sm sm:text-base hidden sm:block">
                    Ajoutez, modifiez ou supprimez des articles de votre menu. Les changements sont visibles en temps réel.
                  </CardDescription>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <UpdateJamaicanBowlButton />
                      <ResetMenuButton />
                    </div>
                    <ImageTestComponent />
                  </div>
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                      <Button onClick={handleAddItem} className="w-full sm:w-auto">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Ajouter un plat</span>
                          <span className="sm:hidden">Ajouter</span>
                      </Button>
                  </DialogTrigger>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>{editingItem ? "Modifier le plat" : "Ajouter un nouveau plat"}</DialogTitle>
                    </DialogHeader>
                    <MenuItemForm
                        onSubmit={handleFormSubmit}
                        defaultValues={editingItem}
                        onCancel={() => setIsFormOpen(false)}
                     />
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
             <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4 text-muted-foreground">Chargement du menu...</p>
            </div>
        ) : menuItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <p>Votre menu est vide.</p>
                <p className="text-sm">Cliquez sur "Ajouter un plat" pour commencer.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                  <TableHeader>
                      <TableRow>
                          <TableHead>Plat</TableHead>
                          <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Prix</TableHead>
                          <TableHead className="w-[70px]">
                              <span className="sr-only">Actions</span>
                          </TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {menuItems.map((item) => (
                          <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <div className="font-semibold text-sm sm:text-base">{item.name}</div>
                                  <div className="text-xs text-muted-foreground sm:hidden">{item.category}</div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">{item.category}</TableCell>
                              <TableCell>
                                  <Badge 
                                    variant={item.status === 'available' ? 'default' : 'destructive'}
                                    className="text-xs"
                                  >
                                      <span className="hidden sm:inline">
                                        {item.status === 'available' ? 'Disponible' : 'En rupture'}
                                      </span>
                                      <span className="sm:hidden">
                                        {item.status === 'available' ? '✓' : '✗'}
                                      </span>
                                  </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm">{item.price.toFixed(2)} €</TableCell>
                              <TableCell className="text-right">
                                  <AlertDialog>
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                                                  <MoreHorizontal className="h-4 w-4" />
                                                  <span className="sr-only">Toggle menu</span>
                                              </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                              <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                                  <FilePenLine className="mr-2 h-4 w-4" />
                                                  Modifier
                                              </DropdownMenuItem>
                                              <AlertDialogTrigger asChild>
                                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      Supprimer
                                                  </DropdownMenuItem>
                                              </AlertDialogTrigger>
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                      <AlertDialogContent className="w-[90vw] max-w-md">
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Cette action est irréversible. Le plat sera définitivement supprimé.
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                          <AlertDialogCancel className="w-full sm:w-auto">Annuler</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="w-full sm:w-auto">Supprimer</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
