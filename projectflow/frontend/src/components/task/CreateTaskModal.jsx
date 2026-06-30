import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function CreateTaskModal({ projectId, columnId, project, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    assignees: [], dueDate: '', labels: []
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Task title is required');
    setLoading(true);
    try {
      const payload = { ...form, columnId, dueDate: form.dueDate || null };
      const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
      toast.success('Task created!');
      onCreated(data.task);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally { setLoading(false); }
  };

  const toggleAssignee = (userId) => {
    setForm(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId]
    }));
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colTitle = project?.columns?.find(c => c.id === columnId)?.title || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Task in "{colTitle}"</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" type="text" placeholder="Task title"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="Add details..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assignees</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {project?.members?.map(m => {
                  const isSelected = form.assignees.includes(m.user._id);
                  return (
                    <button key={m.user._id} type="button" onClick={() => toggleAssignee(m.user._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                        borderRadius: 8, border: '1.5px solid', cursor: 'pointer',
                        borderColor: isSelected ? '#6366f1' : '#e2e8f0',
                        background: isSelected ? '#e0e7ff' : '#fff',
                        fontSize: 13, fontWeight: 500, color: isSelected ? '#4f46e5' : '#374151' }}>
                      <div className="avatar avatar-sm">{getInitials(m.user.name)}</div>
                      {m.user.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
