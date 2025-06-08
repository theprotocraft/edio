import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"
import CreateProjectForm from "@/components/custom/create-project-form"

export default async function NewProjectPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login")
  }
  
  // Check if user is a YouTuber
  const { data: userData, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
    
  if (error || !userData || userData.role !== "youtuber") {
    // Only YouTubers can create projects
    redirect("/dashboard")
  }
  
  return (
<<<<<<< HEAD
    <div className="container max-w-4xl py-6">
      <h1 className="mb-6 text-3xl font-bold">Create New Project</h1>
      <CreateProjectForm />
=======
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>

      <Card className="shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Fill in the details for your new video project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Project Title (Internal)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project title for internal tracking" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="videoTitle"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Video Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter video title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Video Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your YouTube video description" rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="editorId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Assign Editor</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loadingEditors}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an editor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {loadingEditors ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading editors...</span>
                          </div>
                        ) : editors.length > 0 ? (
                          editors.map((editor) => (
                            <SelectItem key={editor.id} value={editor.id}>
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={editor.avatar_url || ""} alt={editor.name} />
                                  <AvatarFallback>{editor.name?.charAt(0).toUpperCase() || 'E'}</AvatarFallback>
                                </Avatar>
                                <span>{editor.name || editor.email}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="flex items-center justify-center py-2">
                            <span className="text-sm text-muted-foreground">No editors invited yet</span>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      You can assign an editor now or later from the project page. <span className="text-muted-foreground/80">Editors must be invited in the Editors tab first.</span>
                    </p>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl shadow-md transition-transform active:scale-[0.98]"
              >
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
>>>>>>> b98ed99 (editor fixes and notifs)
    </div>
  )
}
