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
      activity_logs: {
        Row: {
          activity_type: string
          artist_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          artist_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          artist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_accounts: {
        Row: {
          artist_email: string | null
          artist_name: string
          bio: string | null
          created_at: string
          genre: string | null
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          artist_email?: string | null
          artist_name: string
          bio?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          artist_email?: string | null
          artist_name?: string
          bio?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_custom_buttons: {
        Row: {
          artist_profile_id: string
          created_at: string
          display_order: number | null
          id: string
          title: string
          url: string
        }
        Insert: {
          artist_profile_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          title: string
          url: string
        }
        Update: {
          artist_profile_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_custom_buttons_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_link_clicks: {
        Row: {
          artist_profile_id: string
          clicked_at: string
          country: string | null
          id: string
          ip_address: string | null
          link_label: string | null
          link_type: string
          link_url: string | null
        }
        Insert: {
          artist_profile_id: string
          clicked_at?: string
          country?: string | null
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_type: string
          link_url?: string | null
        }
        Update: {
          artist_profile_id?: string
          clicked_at?: string
          country?: string | null
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_type?: string
          link_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_link_clicks_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profile_views: {
        Row: {
          artist_profile_id: string
          country: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          artist_profile_id: string
          country?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          artist_profile_id?: string
          country?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_profile_views_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          profile_picture_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          username: string
          youtube_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          profile_picture_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          username: string
          youtube_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          profile_picture_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      artists: {
        Row: {
          available_balance: number | null
          ban_reason: string | null
          created_at: string | null
          credit_balance: number | null
          email: string
          id: string
          name: string
          phone: string | null
          status: string | null
          team_name: string | null
          total_earnings: number | null
          wallet_balance: number | null
        }
        Insert: {
          available_balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email: string
          id: string
          name: string
          phone?: string | null
          status?: string | null
          team_name?: string | null
          total_earnings?: number | null
          wallet_balance?: number | null
        }
        Update: {
          available_balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
          team_name?: string | null
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
      clicks: {
        Row: {
          city: string | null
          clicked_at: string
          country: string | null
          device_type: string | null
          fanlink_id: string
          id: string
          ip_address: string | null
          platform_name: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          fanlink_id: string
          id?: string
          ip_address?: string | null
          platform_name?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          fanlink_id?: string
          id?: string
          ip_address?: string | null
          platform_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_fanlink_id_fkey"
            columns: ["fanlink_id"]
            isOneToOne: false
            referencedRelation: "fanlinks"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          artist_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          type: string
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          artist_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          type: string
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          type?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
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
      fanlinks: {
        Row: {
          artist: string
          artist_slug: string
          artwork_url: string | null
          created_at: string
          id: string
          is_published: boolean | null
          isrc: string | null
          release_date: string | null
          release_type: string | null
          slug: string
          title: string
          upc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist: string
          artist_slug: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          isrc?: string | null
          release_date?: string | null
          release_type?: string | null
          slug: string
          title: string
          upc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist?: string
          artist_slug?: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          isrc?: string | null
          release_date?: string | null
          release_type?: string | null
          slug?: string
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income_platforms: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      income_transactions: {
        Row: {
          amount: number
          artist_id: string
          balance_after: number
          created_at: string
          description: string | null
          id: string
          income_id: string | null
          platform_id: string | null
          track_id: string | null
          type: string
        }
        Insert: {
          amount: number
          artist_id: string
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          income_id?: string | null
          platform_id?: string | null
          track_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          artist_id?: string
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          income_id?: string | null
          platform_id?: string | null
          track_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "income_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          date: string
          description: string | null
          id: string
          platform_id: string
          reference: string | null
          track_id: string
          workflow_status: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          date?: string
          description?: string | null
          id?: string
          platform_id: string
          reference?: string | null
          track_id: string
          workflow_status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          platform_id?: string
          reference?: string | null
          track_id?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "income_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      platform_links: {
        Row: {
          created_at: string
          display_order: number | null
          fanlink_id: string
          id: string
          is_active: boolean | null
          platform_name: string
          platform_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          fanlink_id: string
          id?: string
          is_active?: boolean | null
          platform_name: string
          platform_url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          fanlink_id?: string
          id?: string
          is_active?: boolean | null
          platform_name?: string
          platform_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_links_fanlink_id_fkey"
            columns: ["fanlink_id"]
            isOneToOne: false
            referencedRelation: "fanlinks"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_save_actions: {
        Row: {
          action_type: string
          city: string | null
          completed: boolean | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          library_saved: boolean | null
          library_saved_at: string | null
          pre_save_id: string
          spotify_access_token: string | null
          spotify_refresh_token: string | null
          spotify_user_id: string | null
          token_expires_at: string | null
        }
        Insert: {
          action_type: string
          city?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          library_saved?: boolean | null
          library_saved_at?: string | null
          pre_save_id: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
        }
        Update: {
          action_type?: string
          city?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          library_saved?: boolean | null
          library_saved_at?: string | null
          pre_save_id?: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_save_actions_pre_save_id_fkey"
            columns: ["pre_save_id"]
            isOneToOne: false
            referencedRelation: "pre_saves"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_saves: {
        Row: {
          album_title: string | null
          apple_music_resolved: boolean | null
          apple_music_url: string | null
          artist: string
          artist_slug: string
          artwork_url: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_released: boolean | null
          isrc: string | null
          release_date: string | null
          slug: string
          spotify_album_id: string | null
          spotify_artist_id: string | null
          spotify_uri: string | null
          title: string
          upc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          album_title?: string | null
          apple_music_resolved?: boolean | null
          apple_music_url?: string | null
          artist: string
          artist_slug: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_released?: boolean | null
          isrc?: string | null
          release_date?: string | null
          slug: string
          spotify_album_id?: string | null
          spotify_artist_id?: string | null
          spotify_uri?: string | null
          title: string
          upc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          album_title?: string | null
          apple_music_resolved?: boolean | null
          apple_music_url?: string | null
          artist?: string
          artist_slug?: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_released?: boolean | null
          isrc?: string | null
          release_date?: string | null
          slug?: string
          spotify_album_id?: string | null
          spotify_artist_id?: string | null
          spotify_uri?: string | null
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          backup_codes: string[] | null
          bio: string | null
          created_at: string
          email_confirmation_sent_at: string | null
          email_confirmation_token: string | null
          email_confirmed_at: string | null
          email_notifications: boolean | null
          email_opt_in: boolean | null
          full_name: string
          id: string
          marketing_emails: boolean | null
          two_factor_enabled: boolean | null
          two_factor_recovery_code: string | null
          two_factor_recovery_expires: string | null
          two_factor_secret: string | null
          updated_at: string
          user_id: string
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          backup_codes?: string[] | null
          bio?: string | null
          created_at?: string
          email_confirmation_sent_at?: string | null
          email_confirmation_token?: string | null
          email_confirmed_at?: string | null
          email_notifications?: boolean | null
          email_opt_in?: boolean | null
          full_name: string
          id: string
          marketing_emails?: boolean | null
          two_factor_enabled?: boolean | null
          two_factor_recovery_code?: string | null
          two_factor_recovery_expires?: string | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          backup_codes?: string[] | null
          bio?: string | null
          created_at?: string
          email_confirmation_sent_at?: string | null
          email_confirmation_token?: string | null
          email_confirmed_at?: string | null
          email_notifications?: boolean | null
          email_opt_in?: boolean | null
          full_name?: string
          id?: string
          marketing_emails?: boolean | null
          two_factor_enabled?: boolean | null
          two_factor_recovery_code?: string | null
          two_factor_recovery_expires?: string | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      release_audio_clips: {
        Row: {
          clip_end: number
          clip_start: number
          clip_type: string
          created_at: string
          id: string
          release_id: string
          track_id: string
        }
        Insert: {
          clip_end?: number
          clip_start?: number
          clip_type?: string
          created_at?: string
          id?: string
          release_id: string
          track_id: string
        }
        Update: {
          clip_end?: number
          clip_start?: number
          clip_type?: string
          created_at?: string
          id?: string
          release_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_audio_clips_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_audio_clips_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "release_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      release_edit_requests: {
        Row: {
          admin_response: string | null
          artist_id: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          release_id: string
          request_type: string
          requested_changes: Json
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          artist_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          release_id: string
          request_type?: string
          requested_changes: Json
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          artist_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          release_id?: string
          request_type?: string
          requested_changes?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_edit_requests_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_free_tracks: {
        Row: {
          created_at: string
          id: string
          release_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          release_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          release_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_free_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_free_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "release_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      release_store_selections: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          release_id: string
          status: string
          store_category: string
          store_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          release_id: string
          status?: string
          store_category?: string
          store_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          release_id?: string
          status?: string
          store_category?: string
          store_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_store_selections_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_tracks: {
        Row: {
          created_at: string
          duration: number | null
          explicit_content: boolean | null
          featured_artists: string[] | null
          id: string
          isrc: string | null
          release_id: string
          title: string
          track_number: number
        }
        Insert: {
          created_at?: string
          duration?: number | null
          explicit_content?: boolean | null
          featured_artists?: string[] | null
          id?: string
          isrc?: string | null
          release_id: string
          title: string
          track_number: number
        }
        Update: {
          created_at?: string
          duration?: number | null
          explicit_content?: boolean | null
          featured_artists?: string[] | null
          id?: string
          isrc?: string | null
          release_id?: string
          title?: string
          track_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "release_tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          admin_notes: string | null
          artist_id: string
          artist_name: string | null
          artwork_credits: string | null
          audio_file_url: string | null
          copyright_info: string | null
          cover_art_url: string | null
          description: string | null
          explicit_content: boolean | null
          genre: string | null
          id: string
          isrc: string | null
          platforms: string[]
          pre_order_enabled: boolean | null
          pre_order_previews: boolean | null
          pricing: string | null
          primary_language: string | null
          producer_credits: string | null
          release_date: string
          release_time: string | null
          release_timezone: string | null
          release_type: string | null
          songwriter_credits: string | null
          status: Database["public"]["Enums"]["release_status"]
          submission_notes: string | null
          territory: string | null
          title: string
          total_tracks: number | null
          upc: string | null
          updated_at: string | null
          wizard_step: number | null
        }
        Insert: {
          admin_notes?: string | null
          artist_id: string
          artist_name?: string | null
          artwork_credits?: string | null
          audio_file_url?: string | null
          copyright_info?: string | null
          cover_art_url?: string | null
          description?: string | null
          explicit_content?: boolean | null
          genre?: string | null
          id?: string
          isrc?: string | null
          platforms: string[]
          pre_order_enabled?: boolean | null
          pre_order_previews?: boolean | null
          pricing?: string | null
          primary_language?: string | null
          producer_credits?: string | null
          release_date: string
          release_time?: string | null
          release_timezone?: string | null
          release_type?: string | null
          songwriter_credits?: string | null
          status?: Database["public"]["Enums"]["release_status"]
          submission_notes?: string | null
          territory?: string | null
          title: string
          total_tracks?: number | null
          upc?: string | null
          updated_at?: string | null
          wizard_step?: number | null
        }
        Update: {
          admin_notes?: string | null
          artist_id?: string
          artist_name?: string | null
          artwork_credits?: string | null
          audio_file_url?: string | null
          copyright_info?: string | null
          cover_art_url?: string | null
          description?: string | null
          explicit_content?: boolean | null
          genre?: string | null
          id?: string
          isrc?: string | null
          platforms?: string[]
          pre_order_enabled?: boolean | null
          pre_order_previews?: boolean | null
          pricing?: string | null
          primary_language?: string | null
          producer_credits?: string | null
          release_date?: string
          release_time?: string | null
          release_timezone?: string | null
          release_type?: string | null
          songwriter_credits?: string | null
          status?: Database["public"]["Enums"]["release_status"]
          submission_notes?: string | null
          territory?: string | null
          title?: string
          total_tracks?: number | null
          upc?: string | null
          updated_at?: string | null
          wizard_step?: number | null
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
      royalty_splits: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artist_id: string
          created_at: string
          created_by: string | null
          id: string
          percentage: number
          release_id: string | null
          status: string
          track_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artist_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          percentage: number
          release_id?: string | null
          status?: string
          track_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artist_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          percentage?: number
          release_id?: string | null
          status?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_splits_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_splits_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_splits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      site_notices: {
        Row: {
          created_at: string
          created_by: string | null
          dismissible: boolean
          end_at: string | null
          id: string
          is_active: boolean
          level: string
          message: string
          start_at: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          end_at?: string | null
          id?: string
          is_active?: boolean
          level?: string
          message: string
          start_at?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dismissible?: boolean
          end_at?: string | null
          id?: string
          is_active?: boolean
          level?: string
          message?: string
          start_at?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      split_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          percentage: number
          release_id: string | null
          role: string | null
          split_id: string | null
          status: string
          token: string
          track_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          percentage: number
          release_id?: string | null
          role?: string | null
          split_id?: string | null
          status?: string
          token?: string
          track_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          percentage?: number
          release_id?: string | null
          role?: string | null
          split_id?: string | null
          status?: string
          token?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_invitations_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_invitations_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "royalty_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_invitations_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
      tracks: {
        Row: {
          created_at: string
          id: string
          primary_artist_id: string
          release_id: string | null
          release_track_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          primary_artist_id: string
          release_id?: string | null
          release_track_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          primary_artist_id?: string
          release_id?: string | null
          release_track_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_primary_artist_id_fkey"
            columns: ["primary_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_release_track_id_fkey"
            columns: ["release_track_id"]
            isOneToOne: false
            referencedRelation: "release_tracks"
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
          ip_address: unknown
          session_token: string
          two_factor_verified: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          session_token: string
          two_factor_verified?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
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
          approved_at: string | null
          artist_id: string
          bank_name: string | null
          created_at: string
          credit_deduction: number | null
          final_amount: number | null
          id: string
          naira_amount: number | null
          processed_at: string | null
          rejection_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          approved_at?: string | null
          artist_id: string
          bank_name?: string | null
          created_at?: string
          credit_deduction?: number | null
          final_amount?: number | null
          id?: string
          naira_amount?: number | null
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          approved_at?: string | null
          artist_id?: string
          bank_name?: string | null
          created_at?: string
          credit_deduction?: number | null
          final_amount?: number | null
          id?: string
          naira_amount?: number | null
          processed_at?: string | null
          rejection_reason?: string | null
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
          required_role?: Database["public"]["Enums"]["account_role"]
          target_account_id: string
        }
        Returns: boolean
      }
      has_role:
        | { Args: { role_name: string }; Returns: boolean }
        | {
            Args: {
              role: Database["public"]["Enums"]["user_role"]
              user_id: string
            }
            Returns: boolean
          }
      is_account_admin: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      process_income: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_date?: string
          p_description?: string
          p_platform_id: string
          p_reference?: string
          p_track_id: string
        }
        Returns: string
      }
      user_has_active_subscription: {
        Args: { user_id?: string }
        Returns: boolean
      }
      user_is_admin: { Args: { user_id?: string }; Returns: boolean }
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
