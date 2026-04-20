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
      admin_onboarding: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          skipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assessment_criteria: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
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
          display_order: number
          format_rule: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          format_rule?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          format_rule?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          brand_ids: string[]
          created_at: string
          display_order: number
          format_rule: string
          hex_code: string | null
          id: string
          name: string
        }
        Insert: {
          brand_ids?: string[]
          created_at?: string
          display_order?: number
          format_rule?: string
          hex_code?: string | null
          id?: string
          name: string
        }
        Update: {
          brand_ids?: string[]
          created_at?: string
          display_order?: number
          format_rule?: string
          hex_code?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      condition_discounts: {
        Row: {
          condition_name: string
          discount_fixed: number
          discount_mode: string
          discount_percentage: number
          display_order: number
          help_text: string | null
          id: string
          is_active: boolean
          is_rejected: boolean
          is_required: boolean
          model_ids: string[]
          youtube_url: string | null
        }
        Insert: {
          condition_name: string
          discount_fixed?: number
          discount_mode?: string
          discount_percentage: number
          display_order?: number
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_rejected?: boolean
          is_required?: boolean
          model_ids?: string[]
          youtube_url?: string | null
        }
        Update: {
          condition_name?: string
          discount_fixed?: number
          discount_mode?: string
          discount_percentage?: number
          display_order?: number
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_rejected?: boolean
          is_required?: boolean
          model_ids?: string[]
          youtube_url?: string | null
        }
        Relationships: []
      }
      damage_categories: {
        Row: {
          brand_ids: string[]
          created_at: string
          display_order: number
          help_image_url: string | null
          help_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          model_ids: string[]
          name: string
          parent_id: string | null
          parent_option_id: string | null
          youtube_url: string | null
        }
        Insert: {
          brand_ids?: string[]
          created_at?: string
          display_order?: number
          help_image_url?: string | null
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          model_ids?: string[]
          name: string
          parent_id?: string | null
          parent_option_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          brand_ids?: string[]
          created_at?: string
          display_order?: number
          help_image_url?: string | null
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          model_ids?: string[]
          name?: string
          parent_id?: string | null
          parent_option_id?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "damage_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "damage_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_categories_parent_option_id_fkey"
            columns: ["parent_option_id"]
            isOneToOne: false
            referencedRelation: "damage_deductions"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_deductions: {
        Row: {
          created_at: string
          damage_category_id: string
          deduction_mode: string
          deduction_percent: number
          deduction_value: number
          display_order: number
          id: string
          is_rejected: boolean
          option_name: string
        }
        Insert: {
          created_at?: string
          damage_category_id: string
          deduction_mode?: string
          deduction_percent?: number
          deduction_value: number
          display_order?: number
          id?: string
          is_rejected?: boolean
          option_name?: string
        }
        Update: {
          created_at?: string
          damage_category_id?: string
          deduction_mode?: string
          deduction_percent?: number
          deduction_value?: number
          display_order?: number
          id?: string
          is_rejected?: boolean
          option_name?: string
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
          display_order: number
          format_rule: string
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          display_order?: number
          format_rule?: string
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          display_order?: number
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
          brand_id: string | null
          colors: string | null
          created_at: string
          id: string
          model: string
          sale_price: number
          storage: string
          trade_price: number
        }
        Insert: {
          base_price: number
          brand?: string
          brand_id?: string | null
          colors?: string | null
          created_at?: string
          id?: string
          model: string
          sale_price?: number
          storage: string
          trade_price?: number
        }
        Update: {
          base_price?: number
          brand?: string
          brand_id?: string | null
          colors?: string | null
          created_at?: string
          id?: string
          model?: string
          sale_price?: number
          storage?: string
          trade_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "devices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          base_price: number
          condition_discount: number
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          damages: Json
          device_condition: string
          device_id: string | null
          final_value: number
          flow_type: string
          id: string
          imei: string | null
          status: string
          total_deductions: number
        }
        Insert: {
          base_price: number
          condition_discount?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          damages?: Json
          device_condition: string
          device_id?: string | null
          final_value: number
          flow_type?: string
          id?: string
          imei?: string | null
          status?: string
          total_deductions?: number
        }
        Update: {
          base_price?: number
          condition_discount?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          damages?: Json
          device_condition?: string
          device_id?: string | null
          final_value?: number
          flow_type?: string
          id?: string
          imei?: string | null
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
          flow_type: string
          id: string
          imei: string | null
          rejection_reason: string | null
          status: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          assessment_responses?: Json
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          device_id?: string | null
          flow_type?: string
          id?: string
          imei?: string | null
          rejection_reason?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          assessment_responses?: Json
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          device_id?: string | null
          flow_type?: string
          id?: string
          imei?: string | null
          rejection_reason?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
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
          link_url: string | null
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
          link_url?: string | null
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
          link_url?: string | null
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
      model_storages: {
        Row: {
          base_price: number
          created_at: string
          display_order: number
          id: string
          model_id: string
          sale_price: number
          storage_id: string
          trade_price: number
        }
        Insert: {
          base_price?: number
          created_at?: string
          display_order?: number
          id?: string
          model_id: string
          sale_price?: number
          storage_id: string
          trade_price?: number
        }
        Update: {
          base_price?: number
          created_at?: string
          display_order?: number
          id?: string
          model_id?: string
          sale_price?: number
          storage_id?: string
          trade_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_storages_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_storages_storage_id_fkey"
            columns: ["storage_id"]
            isOneToOne: false
            referencedRelation: "storages"
            referencedColumns: ["id"]
          },
        ]
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
          display_order: number
          format_rule: string
          id: string
        }
        Insert: {
          capacity: string
          created_at?: string
          display_order?: number
          format_rule?: string
          id?: string
        }
        Update: {
          capacity?: string
          created_at?: string
          display_order?: number
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
      variant_colors: {
        Row: {
          color_id: string
          created_at: string
          display_order: number
          id: string
          model_storage_id: string
        }
        Insert: {
          color_id: string
          created_at?: string
          display_order?: number
          id?: string
          model_storage_id: string
        }
        Update: {
          color_id?: string
          created_at?: string
          display_order?: number
          id?: string
          model_storage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_colors_model_storage_id_fkey"
            columns: ["model_storage_id"]
            isOneToOne: false
            referencedRelation: "model_storages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_lead_terms: {
        Args: { _lead_id: string; _version: string }
        Returns: undefined
      }
      create_lead: {
        Args: { _email: string; _name: string; _phone: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_valid_imei: { Args: { _imei: string }; Returns: boolean }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      sync_device_for_model_storage: {
        Args: { _ms_id: string }
        Returns: undefined
      }
      update_lead_imei: {
        Args: { _imei: string; _lead_id: string }
        Returns: undefined
      }
      update_lead_progress: {
        Args: {
          _assessment_responses?: Json
          _device_id?: string
          _lead_id: string
          _rejection_reason?: string
          _status?: string
        }
        Returns: undefined
      }
      upsert_lead_by_email: {
        Args: { _email: string; _name: string; _phone: string }
        Returns: string
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
