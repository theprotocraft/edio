"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/app/lib/supabase-client"

interface AddEditorDialogProps {
  projectId: string
  onEditorAdded?: () => void
}

export function AddEditorDialog({ projectId, onEditorAdded }: AddEditorDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('add_project_editor', {
        p_project_id: projectId,
        p_editor_id: email
      })
      
      if (error) throw error

      toast({
        title: "Editor added",
        description: "The editor has been added to your project.",
      })
      setOpen(false)
      setEmail("")
      onEditorAdded?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add editor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Editor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Editor to Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Editor's Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter editor's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Editor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 