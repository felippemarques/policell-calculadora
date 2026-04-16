export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessment_criteria: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_required: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_options: {
        Row: {
          created_at: string
          criterion_id: string
          discount_fixed: number
          discount_percent: number
          display_order: number
          id: string
          is_rejected: boolean
          label: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          discount_fixed?: number
          discount_percent?: number
          display_order?: number
          id?: string
          is_rejected?: boolean
          label: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          discount_fixed?: number
          discount_percent?: number
          display_order?: number
          id?: string
          is_rejected?: boolean
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_options_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "assessment_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          format_rule: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          format_rule?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          format_rule?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string
          format_rule: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          format_rule?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          format_rule?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      condition_discounts: {
        Row: {
          condition_name: string
          discount_percentage: number
          display_order: number
          id: string
          is_rejected: boolean
        }
        Insert: {
          condition_name: string
          discount_percentage: number
          display_order?: number
          id?: string
          is_rejected?: boolean
        }
        Update: {
          condition_name?: string
          discount_percentage?: number
          display_order?: number
          id?: string
          is_rejected?: boolean
        }
        Relationships: []
      }
      damage_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      damage_deductions: {
        Row: {
          created_at: string
          damage_category_id: string
          deduction_value: number
          id: string
        }
        Insert: {
          created_at?: string
          damage_category_id: string
          deduction_value: number
          id?: string
        }
        Update: {
          created_at?: string
          damage_category_id?: string
          deduction_value?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_deductions_damage_category_id_fkey"
            columns: ["damage_category_id"]
            isOneToOne: false
            referencedRelation: "damage_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      device_models: {
        Row: {
          brand_id: string
          created_at: string
          format_rule: string
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          format_rule?: string
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          format_rule?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          base_price: number
          brand: string
          colors: string | null
          created_at: string
          id: string
          model: string
          storage: string
        }
        Insert: {
          base_price: number
          brand?: string
          colors?: string | null
          created_at?: string
          id?: string
          model: string
          storage: string
        }
        Update: {
          base_price?: number
          brand?: string
          colors?: string | null
          created_at?: string
          id?: string
          model?: string
          storage?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          base_price: number
          condition_discount: number
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          damages: Json
          device_condition: string
          device_id: string
          final_value: number
          id: string
          status: string
          total_deductions: number
        }
        Insert: {
          base_price: number
          condition_discount?: number
          coupon_code?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          damages?: Json
          device_condition: string
          device_id: string
          final_value: number
          id?: string
          status?: string
          total_deductions?: number
        }
        Update: {
          base_price?: number
          condition_discount?: number
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          damages?: Json
          device_condition?: string
          device_id?: string
          final_value?: number
          id?: string
          status?: string
          total_deductions?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assessment_responses: Json
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_id: string | null
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_responses?: Json
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_id?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_responses?: Json
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          device_id?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      lp_sections: {
        Row: {
          bg_color: string | null
          content: string | null
          created_at: string
          cta_bg_color: string | null
          cta_border_radius: number | null
          cta_text: string | null
          cta_text_color: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          layout: string
          section_type: string
          text_color: string | null
          title: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          bg_color?: string | null
          content?: string | null
          created_at?: string
          cta_bg_color?: string | null
          cta_border_radius?: number | null
          cta_text?: string | null
          cta_text_color?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          layout?: string
          section_type?: string
          text_color?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          bg_color?: string | null
          content?: string | null
          created_at?: string
          cta_bg_color?: string | null
          cta_border_radius?: number | null
          cta_text?: string | null
          cta_text_color?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          layout?: string
          section_type?: string
          text_color?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      lp_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      lp_videos: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          embed_url: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          embed_url: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          embed_url?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storages: {
        Row: {
          capacity: string
          created_at: string
          format_rule: string
          id: string
        }
        Insert: {
          capacity: string
          created_at?: string
          format_rule?: string
          id?: string
        }
        Update: {
          capacity?: string
          created_at?: string
          format_rule?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      format_rule: "lowercase" | "uppercase" | "capitalize"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      format_rule: ["lowercase", "uppercase", "capitalize"],
    },
  },
} as const
