export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string
          created_at: string
          updated_at: string
          status: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description: string
          created_at?: string
          updated_at?: string
          status?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string
          created_at?: string
          updated_at?: string
          status?: string
          completed_at?: string | null
        }
      }
      uploads: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_type: string
          file_size: number
          s3_key: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_type: string
          file_size: number
          s3_key: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          s3_key?: string
          uploaded_by?: string
          created_at?: string
        }
      }
      video_versions: {
        Row: {
          id: string
          project_id: string
          version_number: number
          s3_key: string
          notes: string | null
          created_by: string
          created_at: string
          status: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          version_number: number
          s3_key: string
          notes: string | null
          created_by: string
          created_at?: string
          status?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          version_number?: number
          s3_key?: string
          notes?: string | null
          created_by?: string
          created_at?: string
          status?: string | null
          approved_at?: string | null
        }
      }
      project_editors: {
        Row: {
          project_id: string
          editor_id: string
        }
        Insert: {
          project_id: string
          editor_id: string
        }
        Update: {
          project_id?: string
          editor_id?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          video_version_id: string
          content: string
          sent_by: string
          sent_at: string
        }
        Insert: {
          id?: string
          video_version_id: string
          content: string
          sent_by: string
          sent_at?: string
        }
        Update: {
          id?: string
          video_version_id?: string
          content?: string
          sent_by?: string
          sent_at?: string
        }
      }
      users: {
        Row: {
          id: string
          full_name: string
          avatar_url: string
        }
        Insert: {
          id: string
          full_name: string
          avatar_url: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string
        }
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
