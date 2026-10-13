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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          body: string
          created_at: string | null
          id: string
          notes: string | null
          question_id: string
          self_rating: number | null
          session_id: string
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id: string
          self_rating?: number | null
          session_id: string
          time_spent_seconds?: number
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string
          self_rating?: number | null
          session_id?: string
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coding_submissions: {
        Row: {
          code: string
          created_at: string
          id: string
          language: string
          problem: Json
          result: Json | null
          score: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          language: string
          problem: Json
          result?: Json | null
          score?: number | null
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          language?: string
          problem?: Json
          result?: Json | null
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      interview_turns: {
        Row: {
          answer: string | null
          created_at: string
          difficulty: string
          evaluation: Json | null
          id: string
          interview_id: string
          question: string
          score: number | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          difficulty: string
          evaluation?: Json | null
          id?: string
          interview_id: string
          question: string
          score?: number | null
          user_id?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          difficulty?: string
          evaluation?: Json | null
          id?: string
          interview_id?: string
          question?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_turns_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          adaptive: boolean
          avg_score: number | null
          category: string
          completed_at: string | null
          context: string | null
          created_at: string
          difficulty: string
          follow_ups: boolean
          id: string
          mode: string
          topic: string
          user_id: string
        }
        Insert: {
          adaptive?: boolean
          avg_score?: number | null
          category: string
          completed_at?: string | null
          context?: string | null
          created_at?: string
          difficulty?: string
          follow_ups?: boolean
          id?: string
          mode?: string
          topic: string
          user_id?: string
        }
        Update: {
          adaptive?: boolean
          avg_score?: number | null
          category?: string
          completed_at?: string | null
          context?: string | null
          created_at?: string
          difficulty?: string
          follow_ups?: boolean
          id?: string
          mode?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          college: string | null
          created_at: string
          full_name: string | null
          graduation_year: number | null
          id: string
          resume_path: string | null
          skills: string[]
          target_role: string | null
          updated_at: string
          xp: number
        }
        Insert: {
          college?: string | null
          created_at?: string
          full_name?: string | null
          graduation_year?: number | null
          id: string
          resume_path?: string | null
          skills?: string[]
          target_role?: string | null
          updated_at?: string
          xp?: number
        }
        Update: {
          college?: string | null
          created_at?: string
          full_name?: string | null
          graduation_year?: number | null
          id?: string
          resume_path?: string | null
          skills?: string[]
          target_role?: string | null
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          category_id: string
          created_at: string | null
          difficulty: string
          estimated_minutes: number
          id: string
          text: string
          tips: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          difficulty?: string
          estimated_minutes?: number
          id?: string
          text: string
          tips?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          difficulty?: string
          estimated_minutes?: number
          id?: string
          text?: string
          tips?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at: string | null
          difficulty: string
          id: string
          question_count: number
          score: number
          time_spent_seconds: number
          topic: string
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty?: string
          id?: string
          question_count?: number
          score?: number
          time_spent_seconds?: number
          topic: string
          total_questions?: number
          user_id?: string
        }
        Update: {
          created_at?: string | null
          difficulty?: string
          id?: string
          question_count?: number
          score?: number
          time_spent_seconds?: number
          topic?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      resume_questions: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          kind: string
          question: string
          resume_item: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          kind?: string
          question: string
          resume_item: string
          topic: string
          user_id?: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          kind?: string
          question?: string
          resume_item?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          category_id: string | null
          completed_at: string | null
          id: string
          started_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          id?: string
          started_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          id?: string
          started_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_ratings: {
        Row: {
          attempts: number
          confidence: number
          history: Json
          id: string
          mastery: number
          rating: number
          topic: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          confidence?: number
          history?: Json
          id?: string
          mastery?: number
          rating?: number
          topic: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          attempts?: number
          confidence?: number
          history?: Json
          id?: string
          mastery?: number
          rating?: number
          topic?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
