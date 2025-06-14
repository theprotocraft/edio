export interface User {
  id: string
  name: string
  avatar_url: string
}

export interface Upload {
  id: string
  project_id: string
  user_id: string
  file_url: string
  file_type: string
  file_name: string
  file_size: number
  created_at: string
  uploader: User
}

export interface VideoVersion {
  id: string
  project_id: string
  version_number: number
  video_url: string
  created_at: string
}

export interface Message {
  id: string
  project_id: string
  user_id: string
  content: string
  created_at: string
  user: User
}

export interface Project {
  id: string
  project_title: string
  video_title: string
  description: string
  hashtags: string[]
  youtube_channel_id: string
  created_at: string
  updated_at: string
  owner_id: string
  owner: User
  editors: User[]
  uploads: Upload[]
  video_versions: VideoVersion[]
  messages: Message[]
  publishing_status: 'idle' | 'publishing' | 'completed' | 'failed'
} 