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
      categories: {
        Row: {
          created_at: string
          id: string
          name_en: string
          name_fa: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          name_en: string
          name_fa?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string
          name_fa?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          film_id: string | null
          id: string
          paid_at: string | null
          provider: string | null
          provider_ref: string | null
          status: string
          supporter: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          film_id?: string | null
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: string
          supporter?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          film_id?: string | null
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: string
          supporter?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          country: string | null
          created_at: string
          film_id: string | null
          id: number
          session_id: string | null
          type: string
          value: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          film_id?: string | null
          id?: number
          session_id?: string | null
          type: string
          value?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          film_id?: string | null
          id?: number
          session_id?: string | null
          type?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      film_credits: {
        Row: {
          credit_type: string
          film_id: string
          id: string
          label_en: string | null
          label_fa: string | null
          sort_order: number
          value_en: string | null
          value_fa: string | null
        }
        Insert: {
          credit_type: string
          film_id: string
          id?: string
          label_en?: string | null
          label_fa?: string | null
          sort_order?: number
          value_en?: string | null
          value_fa?: string | null
        }
        Update: {
          credit_type?: string
          film_id?: string
          id?: string
          label_en?: string | null
          label_fa?: string | null
          sort_order?: number
          value_en?: string | null
          value_fa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "film_credits_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      films: {
        Row: {
          access_mode: string
          category: string | null
          cover_url: string | null
          created_at: string
          director_en: string | null
          director_fa: string | null
          duration_min: number | null
          id: string
          poster_gradient: string | null
          preview_url: string | null
          price_cents: number
          price_toman: number
          slug: string
          sort_order: number
          synopsis_en: string | null
          synopsis_fa: string | null
          ticket_hours: number
          title_en: string
          title_fa: string | null
          updated_at: string
          video_url: string | null
          visibility: string
          year: number | null
        }
        Insert: {
          access_mode?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          director_en?: string | null
          director_fa?: string | null
          duration_min?: number | null
          id?: string
          poster_gradient?: string | null
          preview_url?: string | null
          price_cents?: number
          price_toman?: number
          slug: string
          sort_order?: number
          synopsis_en?: string | null
          synopsis_fa?: string | null
          ticket_hours?: number
          title_en: string
          title_fa?: string | null
          updated_at?: string
          video_url?: string | null
          visibility?: string
          year?: number | null
        }
        Update: {
          access_mode?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          director_en?: string | null
          director_fa?: string | null
          duration_min?: number | null
          id?: string
          poster_gradient?: string | null
          preview_url?: string | null
          price_cents?: number
          price_toman?: number
          slug?: string
          sort_order?: number
          synopsis_en?: string | null
          synopsis_fa?: string | null
          ticket_hours?: number
          title_en?: string
          title_fa?: string | null
          updated_at?: string
          video_url?: string | null
          visibility?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "films_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_list: {
        Row: {
          created_at: string
          email_lower: string
          id: string
          locale: string | null
        }
        Insert: {
          created_at?: string
          email_lower: string
          id?: string
          locale?: string | null
        }
        Update: {
          created_at?: string
          email_lower?: string
          id?: string
          locale?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          menu_label_en: string | null
          menu_label_fa: string | null
          slug: string
          sort_order: number
          title_en: string
          title_fa: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          menu_label_en?: string | null
          menu_label_fa?: string | null
          slug: string
          sort_order?: number
          title_en?: string
          title_fa?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          menu_label_en?: string | null
          menu_label_fa?: string | null
          slug?: string
          sort_order?: number
          title_en?: string
          title_fa?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          id: string
          provider: string | null
          received_at: string
          type: string | null
        }
        Insert: {
          id: string
          provider?: string | null
          received_at?: string
          type?: string | null
        }
        Update: {
          id?: string
          provider?: string | null
          received_at?: string
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_active_at: string | null
          last_ip: string | null
          locale: string
          signup_city: string | null
          signup_country: string | null
          signup_ip: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_active_at?: string | null
          last_ip?: string | null
          locale?: string
          signup_city?: string | null
          signup_country?: string | null
          signup_ip?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          last_ip?: string | null
          locale?: string
          signup_city?: string | null
          signup_country?: string | null
          signup_ip?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          data: Json
          key: string
          updated_at: string
        }
        Insert: {
          data: Json
          key: string
          updated_at?: string
        }
        Update: {
          data?: Json
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          film_id: string
          id: string
          paid_at: string | null
          provider: string | null
          provider_ref: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          film_id: string
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          film_id?: string
          id?: string
          paid_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
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
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
