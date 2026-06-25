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
      allowed_emails: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["seller_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["seller_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["seller_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      crm_arena_seller_links: {
        Row: {
          active: boolean
          arena_seller_id: string
          created_at: string
          crm_user_id: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          arena_seller_id: string
          created_at?: string
          crm_user_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          arena_seller_id?: string
          created_at?: string
          crm_user_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_arena_seller_links_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "crm_arena_seller_links_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "crm_arena_seller_links_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_arena_seller_links_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      crm_integration_events: {
        Row: {
          arena_seller_id: string | null
          created_at: string
          crm_lead_id: string | null
          crm_user_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          arena_seller_id?: string | null
          created_at?: string
          crm_lead_id?: string | null
          crm_user_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          arena_seller_id?: string | null
          created_at?: string
          crm_lead_id?: string | null
          crm_user_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_integration_events_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "crm_integration_events_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "crm_integration_events_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_integration_events_arena_seller_id_fkey"
            columns: ["arena_seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      enrollments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          crm_lead_id: string | null
          enrollment_date: string
          enrollment_value: number
          id: string
          material_value: number
          monthly_fee: number
          notes: string | null
          rejection_reason: string | null
          role_snapshot: Database["public"]["Enums"]["seller_role"]
          seller_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_name: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          crm_lead_id?: string | null
          enrollment_date: string
          enrollment_value?: number
          id?: string
          material_value?: number
          monthly_fee?: number
          notes?: string | null
          rejection_reason?: string | null
          role_snapshot: Database["public"]["Enums"]["seller_role"]
          seller_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_name: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          crm_lead_id?: string | null
          enrollment_date?: string
          enrollment_value?: number
          id?: string
          material_value?: number
          monthly_fee?: number
          notes?: string | null
          rejection_reason?: string | null
          role_snapshot?: Database["public"]["Enums"]["seller_role"]
          seller_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          average_lifetime_months: number
          cancellation_rate: number
          contract_duration_months: number
          created_at: string
          default_enrollment_fee_type: string
          default_enrollment_fee_value: number
          default_school_retention_percentage: number
          general_tools_cost: number
          id: string
          other_commercial_costs: number
          paid_traffic_cost: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          average_lifetime_months?: number
          cancellation_rate?: number
          contract_duration_months?: number
          created_at?: string
          default_enrollment_fee_type?: string
          default_enrollment_fee_value?: number
          default_school_retention_percentage?: number
          general_tools_cost?: number
          id?: string
          other_commercial_costs?: number
          paid_traffic_cost?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          average_lifetime_months?: number
          cancellation_rate?: number
          contract_duration_months?: number
          created_at?: string
          default_enrollment_fee_type?: string
          default_enrollment_fee_value?: number
          default_school_retention_percentage?: number
          general_tools_cost?: number
          id?: string
          other_commercial_costs?: number
          paid_traffic_cost?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          created_at: string
          crm_lead_id: string | null
          id: string
          lead_name: string
          lead_phone: string | null
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          seller_id: string
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          seller_id: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "interviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "interviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      monthly_ranking_snapshots: {
        Row: {
          closed_at: string
          conversion_rate: number
          final_position: number
          id: string
          month: number
          role_snapshot: Database["public"]["Enums"]["seller_role"]
          seller_id: string
          seller_name: string
          total_completed: number
          total_enrollments: number
          total_material: number
          total_scheduled: number
          total_score: number
          year: number
        }
        Insert: {
          closed_at?: string
          conversion_rate?: number
          final_position: number
          id?: string
          month: number
          role_snapshot: Database["public"]["Enums"]["seller_role"]
          seller_id: string
          seller_name: string
          total_completed?: number
          total_enrollments?: number
          total_material?: number
          total_scheduled?: number
          total_score?: number
          year: number
        }
        Update: {
          closed_at?: string
          conversion_rate?: number
          final_position?: number
          id?: string
          month?: number
          role_snapshot?: Database["public"]["Enums"]["seller_role"]
          seller_id?: string
          seller_name?: string
          total_completed?: number
          total_enrollments?: number
          total_material?: number
          total_scheduled?: number
          total_score?: number
          year?: number
        }
        Relationships: []
      }
      seller_financial_settings: {
        Row: {
          active_for_financial_analysis: boolean
          created_at: string
          financial_notes: string | null
          id: string
          manager_user_id: string | null
          monthly_salary: number
          monthly_tools_cost: number
          other_individual_costs: number
          seller_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_for_financial_analysis?: boolean
          created_at?: string
          financial_notes?: string | null
          id?: string
          manager_user_id?: string | null
          monthly_salary?: number
          monthly_tools_cost?: number
          other_individual_costs?: number
          seller_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_for_financial_analysis?: boolean
          created_at?: string
          financial_notes?: string | null
          id?: string
          manager_user_id?: string | null
          monthly_salary?: number
          monthly_tools_cost?: number
          other_individual_costs?: number
          seller_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_financial_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_financial_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_financial_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_financial_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      sellers: {
        Row: {
          avatar: string | null
          commission_rate: number | null
          created_at: string
          deals: number
          director_id: string | null
          goal_deals: number
          goal_material: number
          id: string
          in_my_team: boolean
          manager_seller_id: string | null
          material: number
          name: string
          position: number
          role: Database["public"]["Enums"]["seller_role"]
          score: number
          sort_index: number
          updated_at: string
          user_id: string | null
          week_completed: number
          week_enrollments: number
          week_scheduled: number
        }
        Insert: {
          avatar?: string | null
          commission_rate?: number | null
          created_at?: string
          deals?: number
          director_id?: string | null
          goal_deals?: number
          goal_material?: number
          id?: string
          in_my_team?: boolean
          manager_seller_id?: string | null
          material?: number
          name: string
          position?: number
          role?: Database["public"]["Enums"]["seller_role"]
          score?: number
          sort_index?: number
          updated_at?: string
          user_id?: string | null
          week_completed?: number
          week_enrollments?: number
          week_scheduled?: number
        }
        Update: {
          avatar?: string | null
          commission_rate?: number | null
          created_at?: string
          deals?: number
          director_id?: string | null
          goal_deals?: number
          goal_material?: number
          id?: string
          in_my_team?: boolean
          manager_seller_id?: string | null
          material?: number
          name?: string
          position?: number
          role?: Database["public"]["Enums"]["seller_role"]
          score?: number
          sort_index?: number
          updated_at?: string
          user_id?: string | null
          week_completed?: number
          week_enrollments?: number
          week_scheduled?: number
        }
        Relationships: [
          {
            foreignKeyName: "sellers_manager_seller_id_fkey"
            columns: ["manager_seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "sellers_manager_seller_id_fkey"
            columns: ["manager_seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "sellers_manager_seller_id_fkey"
            columns: ["manager_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellers_manager_seller_id_fkey"
            columns: ["manager_seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      team_financial_settings: {
        Row: {
          average_lifetime_months: number
          cancellation_rate: number
          card_fee_percentage: number
          consultant_commission_percentage: number
          contract_duration_months: number
          created_at: string
          enrollment_fee_type: string
          enrollment_fee_value: number
          general_tools_cost: number
          headquarters_percentage: number
          id: string
          manager_commission_percentage: number
          manager_user_id: string
          other_commercial_costs: number
          paid_traffic_cost: number
          school_retention_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          average_lifetime_months?: number
          cancellation_rate?: number
          card_fee_percentage?: number
          consultant_commission_percentage?: number
          contract_duration_months?: number
          created_at?: string
          enrollment_fee_type?: string
          enrollment_fee_value?: number
          general_tools_cost?: number
          headquarters_percentage?: number
          id?: string
          manager_commission_percentage?: number
          manager_user_id: string
          other_commercial_costs?: number
          paid_traffic_cost?: number
          school_retention_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          average_lifetime_months?: number
          cancellation_rate?: number
          card_fee_percentage?: number
          consultant_commission_percentage?: number
          contract_duration_months?: number
          created_at?: string
          enrollment_fee_type?: string
          enrollment_fee_value?: number
          general_tools_cost?: number
          headquarters_percentage?: number
          id?: string
          manager_commission_percentage?: number
          manager_user_id?: string
          other_commercial_costs?: number
          paid_traffic_cost?: number
          school_retention_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      team_seller_links: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          manager_user_id: string
          seller_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          manager_user_id: string
          seller_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          manager_user_id?: string
          seller_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_seller_links_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "team_seller_links_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "team_seller_links_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seller_links_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_approved_enrollment: {
        Row: {
          approved_at: string | null
          commission_amount: number | null
          created_at: string | null
          enrollment_date: string | null
          enrollment_value: number | null
          id: string | null
          material_value: number | null
          monthly_fee: number | null
          seller_avatar: string | null
          seller_id: string | null
          seller_name: string | null
          seller_role: Database["public"]["Enums"]["seller_role"] | null
          student_name: string | null
        }
        Relationships: []
      }
      monthly_seller_stats: {
        Row: {
          month_completed: number | null
          month_enrollments: number | null
          month_scheduled: number | null
          seller_id: string | null
        }
        Relationships: []
      }
      seller_approved_totals: {
        Row: {
          approved_deals: number | null
          approved_enrollment_value: number | null
          approved_material_value: number | null
          seller_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_monthly_approved_totals: {
        Row: {
          approved_deals: number | null
          approved_material_value: number | null
          month: number | null
          seller_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "latest_approved_enrollment"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "monthly_seller_stats"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "weekly_seller_stats"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      weekly_seller_stats: {
        Row: {
          seller_id: string | null
          week_completed: number | null
          week_enrollments: number | null
          week_scheduled: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_seller_profile: { Args: never; Returns: string }
      close_monthly_ranking: {
        Args: { p_month: number; p_year: number }
        Returns: number
      }
      close_previous_month_ranking: { Args: never; Returns: number }
      current_seller_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_director_like: { Args: { _user_id: string }; Returns: boolean }
      is_director_of: { Args: { _seller_id: string }; Returns: boolean }
      is_seller_like: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_team_manager: { Args: { _user_id: string }; Returns: boolean }
      manages_seller: {
        Args: { _seller_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_seller: { Args: { _seller_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "vendedor"
        | "diretor"
        | "ceo"
        | "presidente"
        | "franqueado"
      enrollment_status: "pending" | "approved" | "rejected"
      interview_status:
        | "marcada"
        | "realizada"
        | "fechada"
        | "nao_compareceu"
        | "reagendada"
        | "perdida"
      seller_role: "consultor" | "gerente"
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
      app_role: [
        "admin",
        "vendedor",
        "diretor",
        "ceo",
        "presidente",
        "franqueado",
      ],
      enrollment_status: ["pending", "approved", "rejected"],
      interview_status: [
        "marcada",
        "realizada",
        "fechada",
        "nao_compareceu",
        "reagendada",
        "perdida",
      ],
      seller_role: ["consultor", "gerente"],
    },
  },
} as const
