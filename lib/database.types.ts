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
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
      unit_wards: {
        Row: {
          unit_id: string
          ward_id: string
        }
        Insert: {
          unit_id: string
          ward_id: string
        }
        Update: {
          unit_id?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_wards_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_wards_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
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
            foreignKeyName: "units_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
