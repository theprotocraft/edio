export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-48 bg-muted rounded animate-pulse"></div>
        <div className="h-10 w-32 bg-muted rounded-full animate-pulse"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
        ))}
      </div>

      {/* Bottom Grid Skeleton */}
      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <div className="h-80 bg-muted rounded-lg animate-pulse"></div>
        <div className="h-80 bg-muted rounded-lg animate-pulse"></div>
      </div>
    </div>
  )
}