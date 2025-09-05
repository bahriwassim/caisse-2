
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      menu_items: {
        Row: {
          aiHint: string | null
          category: string
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          price: number
          status: "available" | "out_of_stock"
        }
        Insert: {
          aiHint?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          image?: string | null
          name: string
          price: number
          status?: "available" | "out_of_stock"
        }
        Update: {
          aiHint?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          price?: number
          status?: "available" | "out_of_stock"
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          price: number
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          order_id: string
          customer_name: string
          customer_email: string | null
          company_name: string | null
          vat_number: string | null
          subtotal_ht: number
          tax_amount: number
          total_ttc: number
          tax_rate: number
          invoice_type: "detailed" | "simple"
          created_at: string
          sent_at: string | null
          status: "draft" | "sent" | "paid"
        }
        Insert: {
          id?: string
          invoice_number: string
          order_id: string
          customer_name: string
          customer_email?: string | null
          company_name?: string | null
          vat_number?: string | null
          subtotal_ht: number
          tax_amount: number
          total_ttc: number
          tax_rate: number
          invoice_type?: "detailed" | "simple"
          created_at?: string
          sent_at?: string | null
          status?: "draft" | "sent" | "paid"
        }
        Update: {
          id?: string
          invoice_number?: string
          order_id?: string
          customer_name?: string
          customer_email?: string | null
          company_name?: string | null
          vat_number?: string | null
          subtotal_ht?: number
          tax_amount?: number
          total_ttc?: number
          tax_rate?: number
          invoice_type?: "detailed" | "simple"
          created_at?: string
          sent_at?: string | null
          status?: "draft" | "sent" | "paid"
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer: string
          id: string
          payment_method: "Stripe" | "Espèces"
          short_id: string | null
          status: "awaiting_payment" | "in_preparation" | "delivered" | "cancelled"
          stripe_session_id: string | null
          table_id: number
          total: number
        }
        Insert: {
          created_at?: string
          customer: string
          id?: string
          payment_method: "Stripe" | "Espèces"
          short_id?: string | null
          status?: "awaiting_payment" | "in_preparation" | "delivered" | "cancelled"
          stripe_session_id?: string | null
          table_id: number
          total: number
        }
        Update: {
          created_at?: string
          customer?: string
          id?: string
          payment_method?: "Carte de crédit" | "Espèces"
          short_id?: string | null
          status?: "awaiting_payment" | "in_preparation" | "delivered" | "cancelled"
          stripe_session_id?: string | null
          table_id?: number
          total?: number
        }
        Relationships: []
      }
      restaurant_info: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          postal_code: string
          country: string
          phone: string | null
          email: string | null
          website: string | null
          logo_url: string | null
          siret: string | null
          vat_number: string | null
          legal_form: string | null
          capital: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          postal_code: string
          country?: string
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          siret?: string | null
          vat_number?: string | null
          legal_form?: string | null
          capital?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          postal_code?: string
          country?: string
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          siret?: string | null
          vat_number?: string | null
          legal_form?: string | null
          capital?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
