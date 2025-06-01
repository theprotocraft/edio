import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertCircle } from "lucide-react"
import type { Project } from "@/lib/dashboard"

interface ProjectCardProps {
  project: Project
  isCreator?: boolean
}

export function ProjectCard({ project, isCreator = false }: ProjectCardProps) {
  const getStatusBadge = () => {
    switch (project.status) {
      case "completed":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {project.title}
          </CardTitle>
          {getStatusBadge()}
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            Last updated: {new Date(project.updated_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
} 