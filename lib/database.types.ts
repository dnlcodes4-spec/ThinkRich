// Generated from the Supabase schema — do not edit by hand.
// Regenerate after migrations with the Supabase MCP `generate_typescript_types`
// (or `supabase gen types typescript`). See supabase/README.md.

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
      lga_member_counters: {
        Row: {
          lga_id: string
          seq: number
        }
        Insert: {
          lga_id: string
          seq?: number
        }
        Update: {
          lga_id?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "lga_member_counters_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: true
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
      lgas: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          state_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          state_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgas_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          date_of_birth: string
          email: string | null
          full_name: string
          id: string
          lga_id: string
          membership_number: string
          nin: string
          passport_photo_url: string | null
          polling_unit_id: string
          registered_by: string
          state_id: string
          status: Database["public"]["Enums"]["member_status"]
          user_id: string | null
          vin: string | null
          ward_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth: string
          email?: string | null
          full_name: string
          id?: string
          lga_id: string
          membership_number?: string
          nin: string
          passport_photo_url?: string | null
          polling_unit_id: string
          registered_by: string
          state_id: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
          vin?: string | null
          ward_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string
          email?: string | null
          full_name?: string
          id?: string
          lga_id?: string
          membership_number?: string
          nin?: string
          passport_photo_url?: string | null
          polling_unit_id?: string
          registered_by?: string
          state_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
          vin?: string | null
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_polling_unit_id_fkey"
            columns: ["polling_unit_id"]
            isOneToOne: false
            referencedRelation: "polling_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      polling_units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          ward_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          ward_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polling_units_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          lga_id: string | null
          polling_unit_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          state_id: string | null
          status: string
          ward_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          lga_id?: string | null
          polling_unit_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          state_id?: string | null
          status?: string
          ward_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          lga_id?: string | null
          polling_unit_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state_id?: string | null
          status?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_polling_unit_id_fkey"
            columns: ["polling_unit_id"]
            isOneToOne: false
            referencedRelation: "polling_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      wards: {
        Row: {
          created_at: string
          id: string
          lga_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          lga_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          lga_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      member_status: "active" | "frozen" | "deleted"
      user_role:
        | "national_admin"
        | "state_admin"
        | "lg_admin"
        | "ward_admin"
        | "unit_coordinator"
        | "leader"
        | "member"
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
      member_status: ["active", "frozen", "deleted"],
      user_role: [
        "national_admin",
        "state_admin",
        "lg_admin",
        "ward_admin",
        "unit_coordinator",
        "leader",
        "member",
      ],
    },
  },
} as const
