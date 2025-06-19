import { redirect } from "next/navigation"

export default async function DashboardPage() {
  // Redirect to the overview page as the canonical dashboard route
  redirect("/dashboard/overview")
}