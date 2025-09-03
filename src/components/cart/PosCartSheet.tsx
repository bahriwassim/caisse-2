
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  PackageCheck,
  Coins,
  CreditCard,
} from "lucide-react";
import type { CartItem, PaymentMethod } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface PosCartSheetProps {
  cart: CartItem[];
  updateCartQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  onNotification?: (notification: { id: string; title: string; description: string; type: 'success' | 'warning' | 'info'; duration: number }) => void;
}

export default function PosCartSheet({
  cart,
  updateCartQuantity,
  clearCart,
  onNotification,
}: PosCartSheetProps) {
  const [orderShortId, setOrderShortId] = useState("");
  const [selectedTable, setSelectedTable] = useState<string>("1");
  const [customerName, setCustomerName] = useState<string>("");
  const { toast } = useToast();
  
  useEffect(() => {
    // Generate a random order number for demo purposes
    const randomOrderNum = Math.floor(Math.random() * 900) + 100;
    setOrderShortId(`POS-${String(randomOrderNum).padStart(3, '0')}`);
  }, [cart]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart
    .reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);


  const handleCheckout = async (paymentMethod: PaymentMethod) => {
     try {
       // 1. Create order
        const finalCustomerName = customerName.trim() || `Client Table ${selectedTable}`;
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer: finalCustomerName,
                table_id: parseInt(selectedTable) || 1,
                status: 'in_preparation', // Assume paid immediately
                payment_method: paymentMethod,
                total: totalPrice,
                short_id: orderShortId,
            })
            .select()
            .single();
        
        if (orderError) throw orderError;
        const orderId = orderData.id;

        // 2. Create order items
        const orderItems = cart.map(ci => ({
            order_id: orderId,
            menu_item_id: ci.menuItem.id,
            quantity: ci.quantity,
            price: ci.menuItem.price
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        // POS notification on left side
        if (onNotification) {
          onNotification({
            id: Math.random().toString(36).substr(2, 9),
            title: "Commande créée !",
            description: `Commande #${orderShortId} ajoutée à la liste`,
            type: 'success',
            duration: 5000
          });
        }
        
        clearCart();
        setCustomerName("");
        setSelectedTable("1");
     } catch(e) {
        console.error("Error adding document: ", e);
        // POS error notification on left side
        if (onNotification) {
          onNotification({
            id: Math.random().toString(36).substr(2, 9),
            title: "Erreur",
            description: "Impossible d'enregistrer la commande",
            type: 'warning',
            duration: 6000
          });
        }
     }
  }


  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="relative">
          <ShoppingCart className="mr-2 h-5 w-5" />
          <span>Voir la Commande</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader className="pr-10">
          <SheetTitle className="font-headline text-2xl">Nouvelle Commande</SheetTitle>
          <SheetDescription>
            ID Commande : {orderShortId} • Table {selectedTable}
          </SheetDescription>
        </SheetHeader>
        
        {/* Customer and Table Selection */}
        <div className="space-y-4 py-4 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="table-select" className="text-sm font-medium">
                Table
              </Label>
              <Input
                id="table-select"
                type="number"
                min="1"
                max="50"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="mt-1"
                placeholder="1"
              />
            </div>
            <div>
              <Label htmlFor="customer-name" className="text-sm font-medium">
                Client (optionnel)
              </Label>
              <Input
                id="customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1"
                placeholder="Nom du client"
              />
            </div>
          </div>
        </div>
        {cart.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
             <ShoppingCart size={64} className="text-muted-foreground/50 mb-4" />
             <p className="text-muted-foreground">La commande est vide.</p>
             <p className="text-sm text-muted-foreground/80">Ajoutez des articles pour commencer.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-grow my-4">
              <div className="flex flex-col gap-4 pr-4">
                {cart.map(({ menuItem, quantity }) => (
                  <div key={menuItem.id} className="flex justify-between items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-semibold">{menuItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {menuItem.price.toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(menuItem.id, quantity - 1)}
                      >
                        {quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                      </Button>
                      <span className="w-6 text-center font-bold">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(menuItem.id, quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="py-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{totalPrice.toFixed(2)} €</span>
              </div>
            </div>
          </>
        )}
        <SheetFooter className="grid grid-cols-2 gap-2">
            <SheetClose asChild>
              <Button
                size="lg"
                className="w-full"
                disabled={cart.length === 0}
                onClick={() => handleCheckout("TPE")}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Payé par TPE
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  disabled={cart.length === 0}
                  onClick={() => handleCheckout("Espèces")}
              >
                  <Coins className="mr-2 h-5 w-5" />
                  Payé en espèces
              </Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
