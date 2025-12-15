'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/context/sidebar-context'
import { 
  LayoutDashboard, 
  Link as LinkIcon,
  Route
} from 'lucide-react'

type NavItem = {
  name: string
  icon: React.ReactNode
  path: string
}

// Navigation items for wa2ai MVP
const navigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: <LayoutDashboard className="h-5 w-5" /> 
  },
  { 
    name: 'Connection', 
    path: '/connection', 
    icon: <LinkIcon className="h-5 w-5" /> 
  },
  { 
    name: 'Routes', 
    path: '/routes', 
    icon: <Route className="h-5 w-5" /> 
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar()

  const isVisible = isExpanded || isHovered || isMobileOpen

  // Close mobile drawer when clicking on a link
  const handleLinkClick = () => {
    if (isMobileOpen) {
      toggleMobileSidebar()
    }
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out',
        'border-r border-border bg-background',
        'flex flex-col',
        // Width based on state
        isExpanded || isMobileOpen
          ? 'w-[290px]'
          : isHovered
          ? 'w-[290px]'
          : 'w-[90px]',
        // Mobile positioning
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
      onMouseEnter={() => !isExpanded && !isMobileOpen && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={cn(
          'py-8 flex border-b border-border',
          !isExpanded && !isHovered && !isMobileOpen
            ? 'lg:justify-center'
            : 'justify-start px-5'
        )}
      >
        <Link href="/dashboard" onClick={handleLinkClick}>
          {isVisible ? (
            <span className="text-xl font-semibold">wa2ai</span>
          ) : (
            <span className="text-xl font-semibold">W</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
            
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  'group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  {item.icon}
                </span>
                {isVisible && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
