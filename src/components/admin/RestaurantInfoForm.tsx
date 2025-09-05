"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantInfo, createOrUpdateRestaurantInfo } from "@/lib/services/restaurantService";
import ImageUpload from "./ImageUpload";
import type { Database } from "@/lib/database.types";

type RestaurantInfo = Database['public']['Tables']['restaurant_info']['Row'];

const restaurantInfoSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères."),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères."),
  postal_code: z.string().min(3, "Le code postal doit contenir au moins 3 caractères."),
  country: z.string().min(2, "Le pays doit contenir au moins 2 caractères."),
  phone: z.string().optional(),
  email: z.string().email("Veuillez entrer une adresse email valide.").optional().or(z.literal('')),
  website: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
  logo_url: z.string().optional(),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
  legal_form: z.string().optional(),
  capital: z.string().optional(),
});

type RestaurantInfoFormValues = z.infer<typeof restaurantInfoSchema>;

export default function RestaurantInfoForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<RestaurantInfoFormValues>({
    resolver: zodResolver(restaurantInfoSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      postal_code: "",
      country: "France",
      phone: "",
      email: "",
      website: "",
      logo_url: "",
      siret: "",
      vat_number: "",
      legal_form: "",
      capital: "",
    },
  });

  useEffect(() => {
    const loadRestaurantInfo = async () => {
      setLoading(true);
      const info = await getRestaurantInfo();
      
      if (info) {
        form.reset({
          name: info.name,
          address: info.address,
          city: info.city,
          postal_code: info.postal_code,
          country: info.country,
          phone: info.phone || "",
          email: info.email || "",
          website: info.website || "",
          logo_url: info.logo_url || "",
          siret: info.siret || "",
          vat_number: info.vat_number || "",
          legal_form: info.legal_form || "",
          capital: info.capital || "",
        });
      }
      
      setLoading(false);
    };

    loadRestaurantInfo();
  }, [form]);

  const onSubmit = async (values: RestaurantInfoFormValues) => {
    setSaving(true);
    
    try {
      const result = await createOrUpdateRestaurantInfo({
        name: values.name,
        address: values.address,
        city: values.city,
        postal_code: values.postal_code,
        country: values.country,
        phone: values.phone || null,
        email: values.email || null,
        website: values.website || null,
        logo_url: values.logo_url || null,
        siret: values.siret || null,
        vat_number: values.vat_number || null,
        legal_form: values.legal_form || null,
        capital: values.capital || null,
      });

      if (result) {
        // Déclencher un événement pour notifier les autres composants
        window.dispatchEvent(new Event('restaurantDetailsUpdated'));
        
        toast({
          title: "Informations sauvegardées",
          description: "Les informations du restaurant ont été mises à jour avec succès.",
        });
      } else {
        throw new Error("Échec de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving restaurant info:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les informations du restaurant.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4 text-muted-foreground">Chargement des informations...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Informations du Restaurant
        </CardTitle>
        <CardDescription>
          Ces informations apparaîtront sur vos factures et documents officiels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Logo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Logo</h3>
              <ImageUpload
                currentImageUrl={form.watch("logo_url")}
                onImageUploaded={(url) => form.setValue("logo_url", url)}
                disabled={saving}
              />
            </div>

            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du restaurant *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mon Restaurant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legal_form"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forme juridique</FormLabel>
                      <FormControl>
                        <Input placeholder="SARL, SAS, Auto-entrepreneur..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIRET</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678901234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de TVA</FormLabel>
                      <FormControl>
                        <Input placeholder="FR12345678901" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capital"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capital social</FormLabel>
                      <FormControl>
                        <Input placeholder="10000€" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Adresse</h3>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Rue de la République" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal *</FormLabel>
                      <FormControl>
                        <Input placeholder="75001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville *</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays *</FormLabel>
                      <FormControl>
                        <Input placeholder="France" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+33 1 23 45 67 89" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@monrestaurant.fr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site web</FormLabel>
                      <FormControl>
                        <Input placeholder="https://monrestaurant.fr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}