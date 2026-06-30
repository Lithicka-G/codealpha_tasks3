import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import './NotificationsPanel.css';

const ICONS = {
  task_assigned: '📌',
  comment_added: '💬',
  project_invite: '🤝',
  task_updated: '✏️',
  deadline_reminder: '⏰'
};

export default function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/auth/notifications');
      setNotifications(data.notifications);
    } catch {}
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/auth/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleClick = (notif) => {
    if (notif.link) { navigate(notif.link); onClose(); }
  };

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-header">
          <h3>Notifications</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="notif-list">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔔</div>
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n, i) => (
              <div key={i} className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => handleClick(n)}>
                <div className="notif-icon">{ICONS[n.type] || '📢'}</div>
                <div className="notif-content">
                  <p className="notif-msg">{n.message}</p>
                  <p className="notif-time">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                {!n.read && <div className="notif-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
