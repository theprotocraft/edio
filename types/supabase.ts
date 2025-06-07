export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string | null
          role: "youtuber" | "editor"
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          role: "youtuber" | "editor"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          role?: "youtuber" | "editor"
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          project_title: string
          video_title: string | null
          description: string | null
          thumbnail_url: string | null
          status: "pending" | "in_review" | "needs_changes" | "approved"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          project_title: string
          video_title?: string | null
          description?: string | null
          thumbnail_url?: string | null
          status?: "pending" | "in_review" | "needs_changes" | "approved"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          project_title?: string
          video_title?: string | null
          description?: string | null
          thumbnail_url?: string | null
          status?: "pending" | "in_review" | "needs_changes" | "approved"
          created_at?: string
          updated_at?: string
        }
      }
      youtuber_editors: {
        id: string
        youtuber_id: string
        editor_id: string
        status: 'pending' | 'active' | 'rejected'
        created_at: string
        updated_at: string
      }
      video_versions: {
        Row: {
          id: string
          project_id: string
          uploader_id: string
          version_number: number
          file_url: string
          preview_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          uploader_id: string
          version_number: number
          file_url: string
          preview_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          uploader_id?: string
          version_number?: number
          file_url?: string
          preview_url?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      uploads: {
        Row: {
          id: string
          project_id: string
          user_id: string
          file_url: string
          file_type: "video" | "thumbnail" | "audio" | "document" | "other"
          file_name: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          file_url: string
          file_type: "video" | "thumbnail" | "audio" | "document" | "other"
          file_name: string
          file_size: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          file_url?: string
          file_type?: "video" | "thumbnail" | "audio" | "document" | "other"
          file_name?: string
          file_size?: number
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          project_id: string
          sender_id: string
          content: string
          type: "text" | "system" | "feedback"
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          sender_id: string
          content: string
          type?: "text" | "system" | "feedback"
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          sender_id?: string
          content?: string
          type?: "text" | "system" | "feedback"
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          type: "info" | "action" | "warning" | "success"
          read: boolean
          project_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          type?: "info" | "action" | "warning" | "success"
          read?: boolean
          project_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          type?: "info" | "action" | "warning" | "success"
          read?: boolean
          project_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
