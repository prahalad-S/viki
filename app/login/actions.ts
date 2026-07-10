"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export async function loginWithProvider(provider: "google" | "github") {
  const supabase = await createClient()
  
  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  const siteUrl = `${protocol}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    console.error("OAuth login error:", error)
    redirect("/login?error=oauth_failed")
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function loginAsGuest() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error("Guest login error:", error)
    redirect("/login?error=guest_failed")
  }

  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
