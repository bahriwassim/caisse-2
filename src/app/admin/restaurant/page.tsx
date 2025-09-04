"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, Building, MapPin, Phone, Mail, FileText, Hash, Image, Upload } from "lucide-react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";

interface RestaurantDetails {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  description?: string;
  vatNumber: string;
  fiscalNumber: string;
  siretNumber?: string;
  logo?: string;
}

export default function RestaurantDetailsPage() {
  const [details, setDetails] = useState<RestaurantDetails>({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    vatNumber: "",
    fiscalNumber: "FR123456789012",
    siretNumber: "",
    logo: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const enhancedToast = useEnhancedToast();

  // Charger les détails depuis le localStorage au montage
  useEffect(() => {
    const savedDetails = localStorage.getItem('restaurantDetails');
    if (savedDetails) {
      try {
        const parsed = JSON.parse(savedDetails);
        setDetails(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erreur lors du chargement des détails restaurant:', error);
      }
    }
  }, []);

  const handleInputChange = (field: keyof RestaurantDetails, value: string) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        enhancedToast.error("Fichier trop volumineux", "La taille du logo ne doit pas dépasser 2MB");
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        enhancedToast.error("Format non supporté", "Seuls les fichiers image sont acceptés");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setDetails(prev => ({ ...prev, logo: base64String }));
        enhancedToast.success("Logo ajouté", "Le logo a été téléchargé avec succès");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setDetails(prev => ({ ...prev, logo: "" }));
    enhancedToast.info("Logo supprimé", "Le logo a été retiré");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validation basique
      if (!details.name.trim()) {
        enhancedToast.warning("Nom requis", "Veuillez saisir le nom du restaurant");
        return;
      }
      
      if (!details.address.trim() || !details.city.trim()) {
        enhancedToast.warning("Adresse incomplète", "Veuillez saisir une adresse complète");
        return;
      }

      // Sauvegarder dans localStorage
      localStorage.setItem('restaurantDetails', JSON.stringify(details));
      
      // Déclencher un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new Event('restaurantDetailsUpdated'));
      
      enhancedToast.success(
        "Détails sauvegardés", 
        "Les informations du restaurant ont été mises à jour avec succès",
        { duration: 4000 }
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      enhancedToast.error("Erreur", "Impossible de sauvegarder les détails");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <Building className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between sm:block">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Détails du Restaurant</CardTitle>
                  <MobileThemeToggle />
                </div>
                <CardDescription className="text-xs sm:text-sm lg:text-base hidden sm:block">
                  Gérez les informations de votre restaurant pour la facturation et les documents officiels
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations générales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurant-name">Nom du restaurant *</Label>
                <Input
                  id="restaurant-name"
                  value={details.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Restaurant Le Délice"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="restaurant-phone">Téléphone</Label>
                <Input
                  id="restaurant-phone"
                  value={details.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="restaurant-email">Email</Label>
                <Input
                  id="restaurant-email"
                  type="email"
                  value={details.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@restaurant.fr"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="restaurant-website">Site web (optionnel)</Label>
                <Input
                  id="restaurant-website"
                  value={details.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://restaurant.fr"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="restaurant-description">Description (optionnelle)</Label>
              <Textarea
                id="restaurant-description"
                value={details.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brève description de votre restaurant..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Logo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo du restaurant
            </h3>
            
            <div className="space-y-4">
              {details.logo ? (
                <div className="flex flex-col items-start gap-4">
                  <div className="relative">
                    <img 
                      src={details.logo} 
                      alt="Logo du restaurant" 
                      className="max-w-xs max-h-32 object-contain border rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Changer le logo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Aucun logo sélectionné</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Télécharger un logo
                    </Button>
                  </div>
                </div>
              )}
              
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              
              <p className="text-xs text-muted-foreground">
                Formats acceptés : JPG, PNG, GIF. Taille maximale : 2MB. 
                Le logo sera affiché à la place de "Caisse Events Lite" dans l'interface client.
              </p>
            </div>
          </div>

          <Separator />

          {/* Adresse */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Adresse
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurant-address">Adresse complète *</Label>
                <Input
                  id="restaurant-address"
                  value={details.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Rue de la Paix"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="restaurant-city">Ville *</Label>
                  <Input
                    id="restaurant-city"
                    value={details.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="restaurant-postal">Code postal</Label>
                  <Input
                    id="restaurant-postal"
                    value={details.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder="75001"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informations fiscales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations fiscales et légales
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fiscal-number">Matricule fiscal *</Label>
                <Input
                  id="fiscal-number"
                  value={details.fiscalNumber}
                  onChange={(e) => handleInputChange('fiscalNumber', e.target.value)}
                  placeholder="FR123456789012"
                />
                <p className="text-xs text-muted-foreground">
                  Ce numéro apparaîtra sur vos factures
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vat-number">Numéro de TVA (optionnel)</Label>
                <Input
                  id="vat-number"
                  value={details.vatNumber}
                  onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  placeholder="FR12345678901"
                />
                <p className="text-xs text-muted-foreground">
                  Format : FR suivi de 11 chiffres
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siret-number">Numéro SIRET (optionnel)</Label>
                <Input
                  id="siret-number"
                  value={details.siretNumber}
                  onChange={(e) => handleInputChange('siretNumber', e.target.value)}
                  placeholder="12345678901234"
                />
                <p className="text-xs text-muted-foreground">
                  14 chiffres pour les établissements français
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder les modifications
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
            <p className="font-medium mb-1">ℹ️ Information</p>
            <p>Ces informations sont stockées localement et seront utilisées pour générer vos factures et documents officiels. Assurez-vous qu'elles sont exactes et à jour.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}