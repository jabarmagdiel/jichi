import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Trash2, Map, Truck } from 'lucide-react'

const navItems = [
  { to: '/admin/dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/admin/contenedores', label: 'Contenedores', icon: Trash2 },
  { to: '/admin/rutas',       label: 'Rutas',         icon: Map },
]

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Trash2 size={28} className="logo-icon" />
          <div>
            <div className="sidebar-title">El JiCHI</div>
            <div className="sidebar-sub">Santa Cruz · Bolivia</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <a
          href="/conductor"
          className="nav-item conductor-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Truck size={18} />
          <span>App Conductor</span>
        </a>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
