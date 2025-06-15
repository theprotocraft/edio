"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search } from "lucide-react"
import { ProjectCard } from "@/components/custom/project-card"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Project {
  id: string
  title: string
  description?: string
  status?: string
  created_at: string
  updated_at?: string
  deadline?: string
  owner?: {
    name: string
    avatar_url?: string
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isCreator, setIsCreator] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to fetch projects')
        }
        const data = await response.json()
        setProjects(data.projects || [])
        setIsCreator(data.isCreator || false)
      } catch (error) {
        console.error("Projects page error:", error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [router])

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = debouncedSearchTerm === "" ||
        project.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (project.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ?? false)
      const matchesStatus = statusFilter === "all" || (project.status && project.status === statusFilter)
      return matchesSearch && matchesStatus
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "deadline":
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [projects, debouncedSearchTerm, statusFilter, sortBy])

  if (loading) {
    return (
      <div className="flex flex-col space-y-6 w-full max-w-none">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          {/* Don't show button while loading since we don't know user role yet */}
        </div>
        <div className="flex items-center justify-center h-60">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 w-full max-w-none">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        {isCreator && (
          <Link href="/dashboard/projects/new">
            <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search projects..." 
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="needs_changes">Needs Changes</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr w-full">
        {filteredAndSortedProjects && filteredAndSortedProjects.length > 0 ? (
          filteredAndSortedProjects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block h-full">
              <ProjectCard
                project={project}
                isCreator={isCreator}
                className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              />
            </Link>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center h-60 text-center">
            <p className="text-muted-foreground mb-4">
              {debouncedSearchTerm || statusFilter !== "all" 
                ? "No projects match your search criteria" 
                : isCreator 
                  ? "No projects found" 
                  : "No projects assigned to you yet"}
            </p>
            {isCreator && (
              <Link href="/dashboard/projects/new">
                <Button className="rounded-2xl shadow-md transition-transform active:scale-[0.98]">
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Project
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
