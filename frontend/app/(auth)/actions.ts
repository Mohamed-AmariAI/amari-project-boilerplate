'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string

  // Step 1: Create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  // Step 2: Create the profile in the profiles table
  // if (authData.user) {
  //   const { error: profileError } = await supabase
  //     .from('profiles')
  //     .insert({
  //       id: authData.user.id,
  //       email: authData.user.email,
  //       first_name: firstName,
  //       last_name: lastName,
  //       role: 'manager',
  //       manager_id: null,
  //     })

  //   if (profileError) {
  //     // If profile creation fails, we should ideally delete the auth user
  //     // However, we can't do that without admin privileges in the client
  //     // So we'll just return an error and let the user know
  //     console.error('Profile creation failed:', profileError)
  //     return {
  //       error: 'Account created but profile setup failed. Please contact support.'
  //     }
  //   }
  // }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/sign-in')
}
