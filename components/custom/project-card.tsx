import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  project: any
  isCreator: boolean
  className?: string
}

export function ProjectCard({ project, isCreator, className }: ProjectCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Approved
          </Badge>
        )
      case "in_review":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            In Review
          </Badge>
        )
      case "needs_changes":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
            Needs Changes
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            In Progress
          </Badge>
        )
    }
  }

  return (
    <Card className={cn("overflow-hidden flex flex-col h-full", className)}>
      <CardContent className="p-6 flex-1">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold line-clamp-1 flex-1 mr-3">{project.project_title}</h3>
          {getStatusBadge(project.status)}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {project.description || "No description provided"}
        </p>
      </CardContent>
      <CardFooter className="p-6 pt-0 border-t border-border/50">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="mr-1 h-3 w-3" />
          <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
        </div>
      </CardFooter>
    </Card>
  )
}
