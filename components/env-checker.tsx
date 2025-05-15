"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function EnvChecker() {
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>([])

  useEffect(() => {
    const requiredEnvVars = [
      { name: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    ]

    const missing = requiredEnvVars.filter((env) => !env.value).map((env) => env.name)
    setMissingEnvVars(missing)
  }, [])

  if (missingEnvVars.length === 0) return null

  return (
    <Alert variant="destructive" className="mb-4 mx-auto max-w-4xl mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Missing Environment Variables</AlertTitle>
      <AlertDescription>
        <p>The following environment variables are missing:</p>
        <ul className="mt-2 list-disc pl-5">
          {missingEnvVars.map((envVar) => (
            <li key={envVar}>{envVar}</li>
          ))}
        </ul>
        <p className="mt-2">
          Please add these variables to your <code>.env.local</code> file or Vercel project settings.
        </p>
      </AlertDescription>
    </Alert>
  )
}
