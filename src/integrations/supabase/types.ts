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
      enrollments: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          enrollment_date: string
          enrollment_value: number
          id: string
          material_value: number
          monthly_fee: number
          notes: string | null
          role_snapshot: Database["public"]["Enums"]["seller_role"]
          seller_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          enrollment_date: string
          enrollment_value?: number
          id?: string
          material_value?: number
          monthly_fee?: number
          notes?: string | null
          role_snapshot: Database["public"]["Enums"]["seller_role"]
          seller_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          enrollment_date?: string
          enrollment_value?: number
          id?: string
          material_value?: number
          monthly_fee?: number
          notes?: string | null
          role_snapshot?: Database["public"]["Enums"]["seller_role"]
          seller_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
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
      interviews: {
        Row: {
          created_at: string
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
      sellers: {
        Row: {
          avatar: string | null
          created_at: string
          deals: number
          goal_deals: number
          goal_material: number
          id: string
          in_my_team: boolean
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
          created_at?: string
          deals?: number
          goal_deals?: number
          goal_material?: number
          id?: string
          in_my_team?: boolean
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
          created_at?: string
          deals?: number
          goal_deals?: number
          goal_material?: number
          id?: string
          in_my_team?: boolean
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
        Relationships: []
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
      current_seller_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "diretor"
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
      app_role: ["admin", "vendedor", "diretor"],
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
