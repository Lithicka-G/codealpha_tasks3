import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function InviteMemberModal({ project, onClose, onUpdated }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleSearch = async (q) => {
    setSearch(q);
    setEmail(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/auth/search?q=${encodeURIComponent(q)}`);
      const memberIds = project.members.map(m => m.user._id || m.user);
      setSearchResults(data.users.filter(u => !memberIds.includes(u._id)));
    } catch {} finally { setSearching(false); }
  };

  const handleInvite = async (inviteEmail) => {
    const targetEmail = inviteEmail || email;
    if (!targetEmail.trim()) return toast.error('Enter an email address');
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${project._id}/invite`, { email: targetEmail, role });
      toast.success('Member invited!');
      onUpdated(data.project);
      setEmail(''); setSearch(''); setSearchResults([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite member');
    } finally { setLoading(false); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const { data } = await api.delete(`/projects/${project._id}/members/${userId}`);
      toast.success('Member removed');
      onUpdated(data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const ROLE_BADGE = { admin: { bg: '#ede9fe', color: '#7c3aed' }, member: { bg: '#dbeafe', color: '#1d4ed8' }, viewer: { bg: '#f0fdf4', color: '#15803d' } };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Team Members</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Invite form */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Invite New Member</h4>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input className="form-input" type="email" placeholder="Search by name or email..."
                value={search} onChange={e => handleSearch(e.target.value)} />
              {searching && (
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                  <div className="spinner spinner-sm" />
                </div>
              )}
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, boxShadow: 'var(--shadow-md)', marginTop: 4 }}>
                  {searchResults.map(u => (
                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setEmail(u.email); setSearch(u.email); setSearchResults([]); }}>
                      <div className="avatar avatar-sm">{getInitials(u.name)}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}
                        onClick={(e) => { e.stopPropagation(); handleInvite(u.email); }}>
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input" style={{ flex: 1 }} value={role} onChange={e => setRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button className="btn btn-primary" onClick={() => handleInvite()} disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : '+ Invite'}
              </button>
            </div>
          </div>

          {/* Members list */}
          <div>
            <h4 style={{ marginBottom: 10, fontSize: 14, fontWeight: 600 }}>
              Current Members ({project.members?.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {project.members?.map(m => {
                const isOwner = (m.user._id || m.user) === (project.owner._id || project.owner);
                const rb = ROLE_BADGE[m.role] || ROLE_BADGE.member;
                return (
                  <div key={m.user._id || m.user} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="avatar avatar-md">{getInitials(m.user.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.user.email}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: rb.bg, color: rb.color }}>{m.role}</span>
                    {isOwner && <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Owner</span>}
                    {!isOwner && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '4px 8px' }}
                        onClick={() => handleRemove(m.user._id || m.user)} title="Remove member">✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
