import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { currentTheme, setTheme, type Theme } from '../theme';
import Icon, { type IconName } from './Icon';

const navItems: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/media', label: 'Media', icon: 'media' },
  { to: '/slides', label: 'Slides', icon: 'slides' },
  { to: '/playlists', label: 'Playlists', icon: 'playlists' },
  { to: '/devices', label: 'Dispositivos', icon: 'screen' },
  { to: '/branches', label: 'Sucursales', icon: 'branch' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  // On small screens the sidebar is a drawer: close it after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div className={`layout${menuOpen ? ' menu-open' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
        <span className="topbar-title">Digital Signage</span>
      </header>

      <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <aside className="sidebar" id="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="screen" size={16} />
          </span>
          Digital Signage
        </div>
        <nav aria-label="Secciones">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">
                <Icon name={item.icon} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <div className="sidebar-actions">
            <button
              type="button"
              className="btn-ghost btn-ghost-icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button type="button" className="btn-ghost" onClick={logout}>
              <Icon name="logout" size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
