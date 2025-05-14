import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ExternalLink } from "lucide-react"

export default function SetupPage() {
  return (
    <div className="container mx-auto py-10">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Edio Setup Guide</CardTitle>
          <CardDescription>Configure your environment variables and database</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="env">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="env">Environment Variables</TabsTrigger>
              <TabsTrigger value="database">Database Setup</TabsTrigger>
            </TabsList>
            <TabsContent value="env" className="space-y-4 pt-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">1. Create a Supabase Project</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  If you haven't already, create a new project on{" "}
                  <Link
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline inline-flex items-center"
                  >
                    Supabase <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">2. Get Your API Credentials</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="supabase-url">Supabase URL</Label>
                    <Input id="supabase-url" placeholder="https://your-project.supabase.co" readOnly />
                    <p className="text-xs text-gray-500">
                      Find this in your Supabase project settings under API settings
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supabase-key">Supabase Anon Key</Label>
                    <Input id="supabase-key" placeholder="your-anon-key" readOnly />
                    <p className="text-xs text-gray-500">
                      Find this in your Supabase project settings under API settings (anon public)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">3. Create a .env.local File</h3>
                <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-900">
                  <pre className="text-sm overflow-x-auto">
                    <code>
                      NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
                      <br />
                      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
                    </code>
                  </pre>
                </div>
                <p className="text-xs text-gray-500">
                  Create a file named .env.local in your project root and add the above content with your actual values
                </p>
              </div>

              <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Important</h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      <p>
                        Make sure the URL starts with "https://" and is a valid URL. If you're deploying to Vercel, add
                        these environment variables in your project settings instead.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="database" className="space-y-4 pt-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">1. Set Up Database Schema</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Run the SQL script from the database-schema.sql file in your Supabase SQL editor
                </p>
                <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-900">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    1. Go to your Supabase project dashboard
                    <br />
                    2. Click on "SQL Editor" in the left sidebar
                    <br />
                    3. Create a new query
                    <br />
                    4. Paste the contents of database-schema.sql
                    <br />
                    5. Run the query
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Try Dashboard Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
