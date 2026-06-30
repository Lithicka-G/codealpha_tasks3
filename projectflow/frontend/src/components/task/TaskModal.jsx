import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { getSocket } from '../../utils/socket';
import './TaskModal.css';

const PRIORITY_OPTIONS = [
  { value: 'low', label: '🟢 Low' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high', label: '🟠 High' },
  { value: 'critical', label: '🔴 Critical' }
];

export default function TaskModal({ task: initialTask, project, onClose, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const [task, setTask] = useState(initialTask);
  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [title, setTitle] = useState(initialTask.title);
  const [desc, setDesc] = useState(initialTask.description || '');
  const [comment, setComment] = useState('');
  const [editCommentId, setEditCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const commentsRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleCommentAdded = ({ taskId, comment: c }) => {
      if (taskId === task._id) setTask(prev => ({ ...prev, comments: [...(prev.comments || []), c] }));
    };
    socket.on('comment:added', handleCommentAdded);
    socket.on('task:updated', ({ task: t }) => { if (t._id === task._id) setTask(t); });
    return () => { socket.off('comment:added', handleCommentAdded); socket.off('task:updated'); };
  }, [task._id]);

  const updateTask = async (updates) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/projects/${task.project}/tasks/${task._id}`, updates);
      setTask(data.task);
      onUpdated(data.task);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) updateTask({ title: title.trim() });
    setEditTitle(false);
  };

  const handleDescSave = () => {
    if (desc !== task.description) updateTask({ description: desc });
    setEditDesc(false);
  };

  const handlePriorityChange = (priority) => updateTask({ priority });
  const handleDueDateChange = (dueDate) => updateTask({ dueDate: dueDate || null });
  const handleColumnChange = (columnId) => updateTask({ columnId });

  const toggleAssignee = (userId) => {
    const current = task.assignees?.map(a => a._id || a) || [];
    const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
    updateTask({ assignees: updated });
  };

  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    const item = { id: Date.now().toString(), text: newCheckItem.trim(), completed: false };
    const updated = [...(task.checklist || []), item];
    await updateTask({ checklist: updated });
    setNewCheckItem('');
  };

  const toggleCheckItem = (id) => {
    const updated = task.checklist.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
    updateTask({ checklist: updated });
  };

  const removeCheckItem = (id) => {
    const updated = task.checklist.filter(c => c.id !== id);
    updateTask({ checklist: updated });
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/projects/${task.project}/tasks/${task._id}/comments`, { content: comment });
      setComment('');
      setTimeout(() => commentsRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error('Failed to post comment');
    } finally { setSubmitting(false); }
  };

  const saveEditComment = async (commentId) => {
    try {
      const { data } = await api.put(`/projects/${task.project}/tasks/${task._id}/comments/${commentId}`, { content: editCommentText });
      setTask(prev => ({ ...prev, comments: prev.comments.map(c => c._id === commentId ? data.comment : c) }));
      setEditCommentId(null);
    } catch { toast.error('Failed to edit comment'); }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/projects/${task.project}/tasks/${task._id}/comments/${commentId}`);
      setTask(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }));
    } catch { toast.error('Failed to delete comment'); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/projects/${task.project}/tasks/${task._id}`);
      toast.success('Task deleted');
      onDeleted(task._id);
    } catch { toast.error('Failed to delete task'); }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const completed = task.checklist?.filter(c => c.completed).length || 0;
  const total = task.checklist?.length || 0;
  const currentMember = project?.members?.find(m => (m.user._id || m.user) === user._id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg task-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            {editTitle ? (
              <input className="form-input task-title-input" value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                autoFocus />
            ) : (
              <h2 className="task-modal-title" onClick={() => setEditTitle(true)}>{task.title}</h2>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
              </span>
              {saving && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving...</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="task-modal-body">
          {/* Main content */}
          <div className="task-main">
            {/* Description */}
            <section className="task-section">
              <h4 className="task-section-title">📝 Description</h4>
              {editDesc ? (
                <div>
                  <textarea className="form-input" rows={5} value={desc}
                    onChange={e => setDesc(e.target.value)}
                    style={{ resize: 'vertical', marginBottom: 8 }} autoFocus />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleDescSave}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditDesc(false); setDesc(task.description || ''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="task-desc" onClick={() => setEditDesc(true)}>
                  {task.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Click to add description...</span>}
                </div>
              )}
            </section>

            {/* Checklist */}
            <section className="task-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 className="task-section-title" style={{ margin: 0 }}>✅ Checklist {total > 0 && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{completed}/{total}</span>}</h4>
              </div>
              {total > 0 && (
                <div className="progress-bar-wrap">
                  <div className="progress-bar" style={{ width: `${(completed/total)*100}%` }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {task.checklist?.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={item.completed} onChange={() => toggleCheckItem(item.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <span style={{ flex: 1, fontSize: 13, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                      {item.text}
                    </span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => removeCheckItem(item.id)}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Add checklist item..."
                    value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCheckItem()} />
                  <button className="btn btn-primary btn-sm" onClick={addCheckItem}>Add</button>
                </div>
              </div>
            </section>

            {/* Comments */}
            <section className="task-section">
              <h4 className="task-section-title">💬 Comments ({task.comments?.length || 0})</h4>
              <div className="comments-list" ref={commentsRef}>
                {task.comments?.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No comments yet. Be the first!</p>
                )}
                {task.comments?.map(c => (
                  <div key={c._id} className="comment">
                    <div className="avatar avatar-sm">{getInitials(c.author?.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.author?.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          {c.edited && ' (edited)'}
                        </span>
                        {c.author?._id === user._id && (
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}
                              onClick={() => { setEditCommentId(c._id); setEditCommentText(c.content); }}>✏️</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => deleteComment(c._id)}>🗑️</button>
                          </div>
                        )}
                      </div>
                      {editCommentId === c._id ? (
                        <div>
                          <textarea className="form-input" rows={2} value={editCommentText}
                            onChange={e => setEditCommentText(e.target.value)} style={{ marginBottom: 6 }} autoFocus />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEditComment(c._id)}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditCommentId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="comment-text">{c.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="comment-input-row">
                <div className="avatar avatar-sm">{getInitials(user?.name)}</div>
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                  <textarea className="form-input" rows={2} placeholder="Write a comment..."
                    value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    style={{ flex: 1, resize: 'none' }} />
                  <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={submitting || !comment.trim()}>
                    {submitting ? '...' : '➤'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="task-sidebar">
            <div className="task-meta-group">
              <div className="task-meta-label">Status</div>
              <select className="form-input" value={task.columnId} onChange={e => handleColumnChange(e.target.value)}>
                {project?.columns?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div className="task-meta-group">
              <div className="task-meta-label">Priority</div>
              <select className="form-input" value={task.priority} onChange={e => handlePriorityChange(e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="task-meta-group">
              <div className="task-meta-label">Due Date</div>
              <input className="form-input" type="date"
                value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                onChange={e => handleDueDateChange(e.target.value)} />
            </div>

            <div className="task-meta-group">
              <div className="task-meta-label">Assignees</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project?.members?.map(m => {
                  const isAssigned = task.assignees?.some(a => (a._id || a) === (m.user._id || m.user));
                  return (
                    <div key={m.user._id} className={`assignee-row ${isAssigned ? 'assigned' : ''}`}
                      onClick={() => toggleAssignee(m.user._id || m.user)}>
                      <div className="avatar avatar-sm">{getInitials(m.user.name)}</div>
                      <span>{m.user.name}</span>
                      {isAssigned && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="task-meta-group">
              <div className="task-meta-label">Reporter</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="avatar avatar-sm">{getInitials(task.reporter?.name)}</div>
                <span style={{ fontSize: 13 }}>{task.reporter?.name}</span>
              </div>
            </div>

            <button className="btn btn-danger btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={handleDelete}>
              🗑️ Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
