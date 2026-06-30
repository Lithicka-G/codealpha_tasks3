import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import NotificationsPanel from '../notifications/NotificationsPanel';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { fetchProjects(); fetchNotificationCount(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNotif = () => {
      setUnreadCount(p => p + 1);
    };
    socket.on('notification', handleNotif);
    return () => socket.off('notification', handleNotif);
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch {}
  };

  const fetchNotificationCount = async () => {
    try {
      const { data } = await api.get('/auth/notifications');
      setUnreadCount(data.notifications.filter(n => !n.read).length);
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">ProjectFlow</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Dashboard</span>
          </Link>

          <div className="nav-section">
            <div className="nav-section-title">
              <span>PROJECTS</span>
              <button className="nav-add-btn" onClick={() => navigate('/dashboard?new=1')} title="New Project">+</button>
            </div>
            <div className="nav-projects">
              {projects.map(p => (
                <Link key={p._id} to={`/projects/${p._id}`}
                  className={`nav-item nav-project ${location.pathname === `/projects/${p._id}` ? 'active' : ''}`}>
                  <span className="project-dot" style={{ background: p.color || '#6366f1' }}>{p.icon || '📋'}</span>
                  <span className="nav-label truncate">{p.name}</span>
                </Link>
              ))}
              {projects.length === 0 && (
                <div className="nav-empty">No projects yet</div>
              )}
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="notif-btn" onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }}>
            <span>🔔</span>
            <span className="nav-label">Notifications</span>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <div className="sidebar-user">
            <div className="avatar avatar-sm">{getInitials(user?.name)}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name truncate">{user?.name}</span>
              <span className="sidebar-user-email truncate">{user?.email}</span>
            </div>
            <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout} title="Logout">⏻</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
