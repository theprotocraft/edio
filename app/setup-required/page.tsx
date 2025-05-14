import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle>Setup Required</CardTitle>
          </div>
          <CardDescription>Edio requires Supabase configuration to function properly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">The following environment variables are missing or invalid:</p>
            <ul className="list-disc pl-5 text-sm">
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            </ul>
            <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Please follow the setup instructions to configure your environment variables.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">Return Home</Link>
          </Button>
          <Button asChild>
            <Link href="/setup">Setup Instructions</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
