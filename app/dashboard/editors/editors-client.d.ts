import { User } from "@supabase/supabase-js"
import { ReactElement } from "react"

export interface EditorsClientProps {
  user: User
}

export function EditorsClient(props: EditorsClientProps): ReactElement 