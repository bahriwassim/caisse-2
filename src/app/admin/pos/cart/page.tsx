"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Coins,
  CreditCard
} from "lucide-react";
import type { CartItem, PaymentMethod } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function PosCartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderShortId, setOrderShortId] = useState("");
  const [selectedTable, setSelectedTable] = useState<string>("1");
  const [customerName, setCustomerName] = useState<string>("");
  const { toast } = useToast();

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('pos_cart');
    console.log('Loading POS cart from localStorage:', savedCart);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log('Parsed POS cart:', parsedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Error parsing POS cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);
  
  useEffect(() => {
    // Generate a random order number
    const randomOrderNum = Math.floor(Math.random() * 900) + 100;
    setOrderShortId(`POS-${String(randomOrderNum).padStart(3, '0')}`);
  }, [cart]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const updateCartQuantity = (menuItemId: string, quantity: number) => {
    setCart((prevCart) => {
      const newCart = quantity <= 0 
        ? prevCart.filter((item) => item.menuItem.id !== menuItemId)
        : prevCart.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          );
      
      // Save to localStorage immediately
      localStorage.setItem('pos_cart', JSON.stringify(newCart));
      
      // Dispatch custom event to notify MenuDisplay
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { isPosMode: true, cart: newCart } 
      }));
      
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('pos_cart');
    // Dispatch custom event to notify MenuDisplay
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { isPosMode: true, cart: [] } 
    }));
  };

  const handleBackToPos = () => {
    // Trigger cart update before navigating back
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { isPosMode: true, cart } 
    }));
    router.push('/admin/pos');
  };

  const handleCheckout = async (paymentMethod: PaymentMethod) => {
    try {
      // Create order
      const finalCustomerName = customerName.trim() || `Client Table ${selectedTable}`;
      const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
              customer: finalCustomerName,
              table_id: parseInt(selectedTable) || 1,
              status: 'in_preparation',
              payment_method: paymentMethod,
              total: totalPrice,
              short_id: orderShortId,
          })
          .select()
          .single();
      
      if (orderError) throw orderError;
      const orderId = orderData.id;

      // Create order items
      const orderItems = cart.map(ci => ({
          order_id: orderId,
          menu_item_id: ci.menuItem.id,
          quantity: ci.quantity,
          price: ci.menuItem.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      toast({
        title: "Commande créée !",
        description: `Commande #${orderShortId} ajoutée à la liste`,
      });
      
      clearCart();
      setCustomerName("");
      setSelectedTable("1");
      router.push('/admin/pos');
   } catch(e) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer la commande",
      });
   }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={handleBackToPos}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au POS
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Nouvelle Commande</h1>
            <p className="text-muted-foreground">ID Commande : {orderShortId} • Table {selectedTable}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer and Table Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de la commande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Cart Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Articles de la commande
                {totalItems > 0 && (
                  <Badge variant="secondary">{totalItems} article{totalItems > 1 ? 's' : ''}</Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={48} className="text-muted-foreground/50 mb-4 mx-auto" />
                  <p className="text-muted-foreground mb-2">La commande est vide</p>
                  <p className="text-sm text-muted-foreground/80 mb-4">
                    Ajoutez des articles pour commencer
                  </p>
                  <Button onClick={handleBackToPos}>
                    Retour au POS
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-4">
                      {cart.map(({ menuItem, quantity }) => (
                        <div key={menuItem.id} className="flex justify-between items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-semibold">{menuItem.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {menuItem.description}
                            </p>
                            <p className="text-sm font-medium text-primary">
                              {menuItem.price.toFixed(2)} € l'unité
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(menuItem.id, quantity - 1)}
                            >
                              {quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                            </Button>
                            <span className="w-8 text-center font-bold">{quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(menuItem.id, quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="font-bold">
                              {(menuItem.price * quantity).toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator className="my-6" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{totalPrice.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Payment buttons */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={cart.length === 0}
                      onClick={() => handleCheckout("TPE")}
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Payé par TPE
                    </Button>
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
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}