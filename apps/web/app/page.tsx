import { redirect } from 'next/navigation'

/**
 * Home page component.
 * 
 * Redirects users to the dashboard page.
 * This is the root route that serves as an entry point.
 * 
 * @returns Redirects to /dashboard (no UI rendered)
 */
export default function HomePage() {
  redirect('/dashboard')
}
