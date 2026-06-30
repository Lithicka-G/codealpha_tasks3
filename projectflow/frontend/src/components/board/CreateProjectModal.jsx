import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];
const ICONS = ['📋','🚀','💡','🎯','⚡','🔥','💎','🌟','🛠️','📊','🎨','🏗️'];

export default function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', icon: '📋' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    setLoading(true);
    try {
      const { data } = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Project</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ background: form.color, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 32 }}>{form.icon}</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{form.name || 'Project Name'}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" type="text" placeholder="e.g. Website Redesign"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="What is this project about?"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ resize: 'vertical' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #000' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Icon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                    style={{ fontSize: 22, padding: '4px 6px', borderRadius: 8, background: form.icon === icon ? '#e0e7ff' : 'transparent', border: '1px solid', borderColor: form.icon === icon ? '#6366f1' : 'transparent', cursor: 'pointer' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
