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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          id: string
          metadata: Json | null
          state_id: string | null
          subject_id: string | null
          subject_type: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name: string
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          id?: string
          metadata?: Json | null
          state_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          id?: string
          metadata?: Json | null
          state_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      candidacies: {
        Row: {
          bio: string | null
          constituency_id: string | null
          created_at: string
          created_by: string | null
          election_id: string
          full_name: string
          id: string
          is_endorsed: boolean
          is_published: boolean
          lga_id: string | null
          office_type_id: string
          party_id: string | null
          photo_url: string | null
          published_at: string | null
          running_mate_name: string | null
          slogan: string | null
          state_id: string | null
          updated_at: string
          updated_by: string | null
          ward_id: string | null
        }
        Insert: {
          bio?: string | null
          constituency_id?: string | null
          created_at?: string
          created_by?: string | null
          election_id: string
          full_name: string
          id?: string
          is_endorsed?: boolean
          is_published?: boolean
          lga_id?: string | null
          office_type_id: string
          party_id?: string | null
          photo_url?: string | null
          published_at?: string | null
          running_mate_name?: string | null
          slogan?: string | null
          state_id?: string | null
          updated_at?: string
          updated_by?: string | null
          ward_id?: string | null
        }
        Update: {
          bio?: string | null
          constituency_id?: string | null
          created_at?: string
          created_by?: string | null
          election_id?: string
          full_name?: string
          id?: string
          is_endorsed?: boolean
          is_published?: boolean
          lga_id?: string | null
          office_type_id?: string
          party_id?: string | null
          photo_url?: string | null
          published_at?: string | null
          running_mate_name?: string | null
          slogan?: string | null
          state_id?: string | null
          updated_at?: string
          updated_by?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidacies_constituency_id_fkey"
            columns: ["constituency_id"]
            isOneToOne: false
            referencedRelation: "constituencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_office_type_id_fkey"
            columns: ["office_type_id"]
            isOneToOne: false
            referencedRelation: "office_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidacies_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          created_at: string
          field: string
          id: string
          member_id: string
          new_value: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          member_id: string
          new_value: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          member_id?: string
          new_value?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      constituencies: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["constituency_kind"]
          name: string
          state_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["constituency_kind"]
          name: string
          state_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["constituency_kind"]
          name?: string
          state_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "constituencies_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      constituency_lgas: {
        Row: {
          constituency_id: string
          kind: Database["public"]["Enums"]["constituency_kind"]
          lga_id: string
        }
        Insert: {
          constituency_id: string
          kind: Database["public"]["Enums"]["constituency_kind"]
          lga_id: string
        }
        Update: {
          constituency_id?: string
          kind?: Database["public"]["Enums"]["constituency_kind"]
          lga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "constituency_lgas_constituency_id_kind_fkey"
            columns: ["constituency_id", "kind"]
            isOneToOne: false
            referencedRelation: "constituencies"
            referencedColumns: ["id", "kind"]
          },
          {
            foreignKeyName: "constituency_lgas_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
      constituency_wards: {
        Row: {
          constituency_id: string
          kind: Database["public"]["Enums"]["constituency_kind"]
          ward_id: string
        }
        Insert: {
          constituency_id: string
          kind: Database["public"]["Enums"]["constituency_kind"]
          ward_id: string
        }
        Update: {
          constituency_id?: string
          kind?: Database["public"]["Enums"]["constituency_kind"]
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "constituency_wards_constituency_id_kind_fkey"
            columns: ["constituency_id", "kind"]
            isOneToOne: false
            referencedRelation: "constituencies"
            referencedColumns: ["id", "kind"]
          },
          {
            foreignKeyName: "constituency_wards_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      election_office_types: {
        Row: {
          election_id: string
          office_type_id: string
        }
        Insert: {
          election_id: string
          office_type_id: string
        }
        Update: {
          election_id?: string
          office_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_office_types_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_office_types_office_type_id_fkey"
            columns: ["office_type_id"]
            isOneToOne: false
            referencedRelation: "office_types"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          created_at: string
          election_date: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          scope: Database["public"]["Enums"]["election_scope"]
          state_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          election_date: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          scope: Database["public"]["Enums"]["election_scope"]
          state_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          election_date?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          scope?: Database["public"]["Enums"]["election_scope"]
          state_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elections_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_kym_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          leader_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          leader_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          leader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_kym_codes_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          frozen_at: string | null
          full_name: string
          id: string
          lga_id: string
          membership_number: string
          nin: string | null
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
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          frozen_at?: string | null
          full_name: string
          id?: string
          lga_id: string
          membership_number?: string
          nin?: string | null
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
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          frozen_at?: string | null
          full_name?: string
          id?: string
          lga_id?: string
          membership_number?: string
          nin?: string | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      office_types: {
        Row: {
          constituency_kind: Database["public"]["Enums"]["constituency_kind"]
          created_at: string
          has_running_mate: boolean
          id: string
          is_active: boolean
          key: string
          notes: string | null
          running_mate_title: string | null
          seat_count: number | null
          sort_order: number
          tier: string
          title: string
          title_plural: string
          updated_at: string
        }
        Insert: {
          constituency_kind: Database["public"]["Enums"]["constituency_kind"]
          created_at?: string
          has_running_mate?: boolean
          id?: string
          is_active?: boolean
          key: string
          notes?: string | null
          running_mate_title?: string | null
          seat_count?: number | null
          sort_order: number
          tier: string
          title: string
          title_plural: string
          updated_at?: string
        }
        Update: {
          constituency_kind?: Database["public"]["Enums"]["constituency_kind"]
          created_at?: string
          has_running_mate?: boolean
          id?: string
          is_active?: boolean
          key?: string
          notes?: string | null
          running_mate_title?: string | null
          seat_count?: number | null
          sort_order?: number
          tier?: string
          title?: string
          title_plural?: string
          updated_at?: string
        }
        Relationships: []
      }
      opt_out_requests: {
        Row: {
          created_at: string
          id: string
          member_id: string
          reason: string | null
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          retention_until: string
          status: Database["public"]["Enums"]["opt_out_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          reason?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          retention_until: string
          status?: Database["public"]["Enums"]["opt_out_status"]
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          reason?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          retention_until?: string
          status?: Database["public"]["Enums"]["opt_out_status"]
        }
        Relationships: [
          {
            foreignKeyName: "opt_out_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opt_out_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          acronym: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          acronym: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          acronym?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
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
      ward_constituencies: {
        Row: {
          constituency_id: string | null
          kind: Database["public"]["Enums"]["constituency_kind"] | null
          ward_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      candidacies_for_geography: {
        Args: { p_lga_id?: string; p_state_id?: string; p_ward_id?: string }
        Returns: {
          bio: string | null
          constituency_id: string | null
          created_at: string
          created_by: string | null
          election_id: string
          full_name: string
          id: string
          is_endorsed: boolean
          is_published: boolean
          lga_id: string | null
          office_type_id: string
          party_id: string | null
          photo_url: string | null
          published_at: string | null
          running_mate_name: string | null
          slogan: string | null
          state_id: string | null
          updated_at: string
          updated_by: string | null
          ward_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "candidacies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      candidacies_i_manage: {
        Args: Record<PropertyKey, never>
        Returns: {
          bio: string | null
          constituency_id: string | null
          created_at: string
          created_by: string | null
          election_id: string
          full_name: string
          id: string
          is_endorsed: boolean
          is_published: boolean
          lga_id: string | null
          office_type_id: string
          party_id: string | null
          photo_url: string | null
          published_at: string | null
          running_mate_name: string | null
          slogan: string | null
          state_id: string | null
          updated_at: string
          updated_by: string | null
          ward_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "candidacies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_manage_candidacy: {
        Args: {
          p_constituency_id?: string
          p_lga_id?: string
          p_office_type_id: string
          p_state_id?: string
          p_ward_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      change_request_status: "pending" | "approved" | "rejected"
      constituency_kind:
        | "nation"
        | "state"
        | "lga"
        | "ward"
        | "senatorial_district"
        | "federal_constituency"
        | "state_constituency"
      election_scope: "national" | "state"
      member_status: "active" | "frozen" | "deleted"
      opt_out_status: "requested" | "frozen" | "deleted" | "reactivated"
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
      change_request_status: ["pending", "approved", "rejected"],
      constituency_kind: [
        "nation",
        "state",
        "lga",
        "ward",
        "senatorial_district",
        "federal_constituency",
        "state_constituency",
      ],
      election_scope: ["national", "state"],
      member_status: ["active", "frozen", "deleted"],
      opt_out_status: ["requested", "frozen", "deleted", "reactivated"],
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
