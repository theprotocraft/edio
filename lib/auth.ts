import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

export async function signUp(email: string, password: string, firstName: string, lastName: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    // Create the user in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (authError) throw authError

    // If auth signup was successful and we have a user, create a record in the users table
    if (authData.user) {
      const { error: profileError } = await supabase
        .from("users") // Changed from 'profiles' to 'users'
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
        })

      if (profileError) throw profileError
    }

    return { success: true, user: authData.user }
  } catch (error) {
    console.error("Error during sign up:", error)
    return { success: false, error }
  }
}

export async function signIn(email: string, password: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { success: true, user: data.user, session: data.session }
  } catch (error) {
    console.error("Error during sign in:", error)
    return { success: false, error }
  }
}

export async function signOut() {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error during sign out:", error)
    return { success: false, error }
  }
}

export async function resetPassword(email: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error during password reset:", error)
    return { success: false, error }
  }
}

export async function updatePassword(password: string) {
  const supabase = createClientComponentClient<Database>()

  try {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating password:", error)
    return { success: false, error }
  }
}
