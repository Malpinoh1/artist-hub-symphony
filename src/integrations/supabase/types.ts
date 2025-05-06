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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
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
      has_role: {
        Args:
          | { role_name: string }
          | { user_id: string; role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
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
