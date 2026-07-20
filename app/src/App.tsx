import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Menu, X, Gift, LayoutDashboard, ShieldAlert } from 'lucide-react'
import { AuthProvider } from './auth/AuthProvider'
import { Logo } from './components/Logo'
import { ThemeToggle } from './components/ThemeToggle'
import { ConnectButton } from './components/ConnectButton'
import { useIsAdmin } from './hooks/useAdmin'

// Nav items (public + private): inline on lg+, collapsed into a burger dropdown on small screens.
const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/rewards', label: 'Rewards Plan', Icon: Gift },
]

// Root layout: provides auth context + the shared nav; child routes render into <Outlet/>.
export default function App() {
  const [open, setOpen] = useState(false)
  const { isOwner } = useIsAdmin()
  // Admin link is shown only to the contract owner.
  const items = isOwner ? [...navItems, { to: '/admin', label: 'Admin', Icon: ShieldAlert }] : navItems

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-bg text-fg">
        <nav className="relative border-b border-border px-6 py-4 flex items-center justify-between">
          {/* left: logo + nav (burger on small, inline links on lg) */}
          <div className="flex items-center gap-4">
            <Link to="/"><Logo size={30} /></Link>

            <button
              type="button"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden rounded-lg p-2 text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary transition-colors"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="hidden lg:flex items-center gap-6">
              {items.map(({ to, label }) => (
                <Link key={to} to={to} className="text-sm text-muted hover:text-fg transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* right: wallet connection + theme toggle */}
          <div className="flex items-center gap-3">
            <ConnectButton />
            <ThemeToggle />
          </div>

          {/* mobile dropdown: two-column grid, each item is an icon with its label below */}
          {open && (
            <div className="lg:hidden absolute top-full inset-x-0 z-50 border-b border-border bg-bg shadow-lg">
              <div className="grid grid-cols-2 gap-3 p-4">
                {items.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-5 text-muted hover:text-fg hover:bg-surface transition-colors"
                  >
                    <Icon size={24} />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
        <main className="flex-1"><Outlet /></main>
      </div>
    </AuthProvider>
  )
}
