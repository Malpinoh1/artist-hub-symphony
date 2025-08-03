export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_access: {
        Row: {
          account_owner_id: string
          created_at: string
          granted_by: string
          id: string
          role: Database["public"]["Enums"]["account_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_owner_id: string
          created_at?: string
          granted_by: string
          id?: string
          role?: Database["public"]["Enums"]["account_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_owner_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          role?: Database["public"]["Enums"]["account_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      account_invitations: {
        Row: {
          account_owner_id: string
          created_at: string
          expires_at: string
          id: string
          invited_email: string
          role: Database["public"]["Enums"]["account_role"]
          status: string
          token: string
        }
        Insert: {
          account_owner_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_email: string
          role?: Database["public"]["Enums"]["account_role"]
          status?: string
          token?: string
        }
        Update: {
          account_owner_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_email?: string
          role?: Database["public"]["Enums"]["account_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          available_balance: number | null
          ban_reason: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          status: string | null
          total_earnings: number | null
          wallet_balance: number | null
        }
        Insert: {
          available_balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          status?: string | null
          total_earnings?: number | null
          wallet_balance?: number | null
        }
        Update: {
          available_balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
          total_earnings?: number | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          audio_url: string | null
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          id: string
          published: boolean
          rich_content: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          author_id: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          rich_content?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          rich_content?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      earnings: {
        Row: {
          amount: number
          artist_id: string
          date: string
          id: string
          status: Database["public"]["Enums"]["earnings_status"]
        }
        Insert: {
          amount: number
          artist_id: string
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["earnings_status"]
        }
        Update: {
          amount?: number
          artist_id?: string
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["earnings_status"]
        }
        Relationships: [
          {
            foreignKeyName: "earnings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_statistics: {
        Row: {
          apple_music_streams: number
          created_at: string
          date: string
          id: string
          other_streams: number
          release_id: string
          spotify_streams: number
          total_streams: number
          youtube_music_streams: number
        }
        Insert: {
          apple_music_streams?: number
          created_at?: string
          date?: string
          id?: string
          other_streams?: number
          release_id: string
          spotify_streams?: number
          total_streams?: number
          youtube_music_streams?: number
        }
        Update: {
          apple_music_streams?: number
          created_at?: string
          date?: string
          id?: string
          other_streams?: number
          release_id?: string
          spotify_streams?: number
          total_streams?: number
          youtube_music_streams?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_statistics_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_analytics: {
        Row: {
          apple_music_growth: number
          apple_music_plays: number
          deezer_growth: number
          deezer_plays: number
          id: string
          last_updated: string
          spotify_growth: number
          spotify_plays: number
          youtube_music_growth: number
          youtube_music_plays: number
        }
        Insert: {
          apple_music_growth?: number
          apple_music_plays?: number
          deezer_growth?: number
          deezer_plays?: number
          id?: string
          last_updated?: string
          spotify_growth?: number
          spotify_plays?: number
          youtube_music_growth?: number
          youtube_music_plays?: number
        }
        Update: {
          apple_music_growth?: number
          apple_music_plays?: number
          deezer_growth?: number
          deezer_plays?: number
          id?: string
          last_updated?: string
          spotify_growth?: number
          spotify_plays?: number
          youtube_music_growth?: number
          youtube_music_plays?: number
        }
        Relationships: []
      }
      platform_earnings: {
        Row: {
          admin_notes: string | null
          artist_id: string
          created_at: string
          currency: string
          earnings_amount: number
          id: string
          period_end: string
          period_start: string
          platform: string
          release_id: string | null
          status: string
          streams: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          artist_id: string
          created_at?: string
          currency?: string
          earnings_amount?: number
          id?: string
          period_end: string
          period_start: string
          platform: string
          release_id?: string | null
          status?: string
          streams?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          artist_id?: string
          created_at?: string
          currency?: string
          earnings_amount?: number
          id?: string
          period_end?: string
          period_start?: string
          platform?: string
          release_id?: string | null
          status?: string
          streams?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_earnings_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          backup_codes: string[] | null
          bio: string | null
          created_at: string
          email_notifications: boolean | null
          full_name: string
          id: string
          marketing_emails: boolean | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          backup_codes?: string[] | null
          bio?: string | null
          created_at?: string
          email_notifications?: boolean | null
          full_name: string
          id: string
          marketing_emails?: boolean | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          backup_codes?: string[] | null
          bio?: string | null
          created_at?: string
          email_notifications?: boolean | null
          full_name?: string
          id?: string
          marketing_emails?: boolean | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      releases: {
        Row: {
          artist_id: string
          audio_file_url: string | null
          cover_art_url: string | null
          id: string
          isrc: string | null
          platforms: string[]
          release_date: string
          status: Database["public"]["Enums"]["release_status"]
          title: string
          upc: string | null
        }
        Insert: {
          artist_id: string
          audio_file_url?: string | null
          cover_art_url?: string | null
          id?: string
          isrc?: string | null
          platforms: string[]
          release_date: string
          status?: Database["public"]["Enums"]["release_status"]
          title: string
          upc?: string | null
        }
        Update: {
          artist_id?: string
          audio_file_url?: string | null
          cover_art_url?: string | null
          id?: string
          isrc?: string | null
          platforms?: string[]
          release_date?: string
          status?: Database["public"]["Enums"]["release_status"]
          title?: string
          upc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_statements: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string | null
          currency: string
          generated_at: string
          id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          statement_number: string
          status: string
          total_earnings: number
          total_streams: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          generated_at?: string
          id?: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          statement_number: string
          status?: string
          total_earnings?: number
          total_streams?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          generated_at?: string
          id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          statement_number?: string
          status?: string
          total_earnings?: number
          total_streams?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_statements_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_links: {
        Row: {
          created_at: string
          id: string
          platform: string
          release_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          release_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          release_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaming_links_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      take_down_requests: {
        Row: {
          admin_notes: string | null
          artist_id: string
          created_at: string
          id: string
          processed_at: string | null
          reason: string
          release_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          artist_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          reason: string
          release_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          artist_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string
          release_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "take_down_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "take_down_requests_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          session_token: string
          two_factor_verified: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          session_token: string
          two_factor_verified?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          session_token?: string
          two_factor_verified?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          artist_id: string
          bank_name: string | null
          created_at: string
          id: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          artist_id: string
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          artist_id?: string
          bank_name?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_account_access: {
        Args: {
          target_account_id: string
          required_role?: Database["public"]["Enums"]["account_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args:
          | { role_name: string }
          | { user_id: string; role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_account_admin: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      user_has_active_subscription: {
        Args: { user_id?: string }
        Returns: boolean
      }
      user_is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      account_role: "account_admin" | "manager" | "viewer"
      earnings_status: "Pending" | "Paid"
      release_status:
        | "Pending"
        | "Approved"
        | "Rejected"
        | "TakeDown"
        | "TakeDownRequested"
      user_role: "user" | "admin"
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
      account_role: ["account_admin", "manager", "viewer"],
      earnings_status: ["Pending", "Paid"],
      release_status: [
        "Pending",
        "Approved",
        "Rejected",
        "TakeDown",
        "TakeDownRequested",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const
