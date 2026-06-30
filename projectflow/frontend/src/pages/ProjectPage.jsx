import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import TaskModal from '../components/task/TaskModal';
import CreateTaskModal from '../components/task/CreateTaskModal';
import InviteMemberModal from '../components/board/InviteMemberModal';
import './ProjectPage.css';

const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#be185d' };

export default function ProjectPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [createColumn, setCreateColumn] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [filter, setFilter] = useState({ priority: '', assignee: '' });

  useEffect(() => {
    fetchProject();
    fetchTasks();
    setupSocket();
    return () => cleanupSocket();
  }, [projectId]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t._id === taskId);
      if (task) { setSelectedTask(task); setSearchParams({}); }
    }
  }, [searchParams, tasks]);

  const setupSocket = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join:project', projectId);
    socket.on('task:created', ({ task }) => setTasks(prev => [...prev, task]));
    socket.on('task:updated', ({ task }) => setTasks(prev => prev.map(t => t._id === task._id ? task : t)));
    socket.on('task:deleted', ({ taskId }) => setTasks(prev => prev.filter(t => t._id !== taskId)));
    socket.on('task:moved', ({ taskId, columnId, order }) => {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, columnId, order } : t));
    });
    socket.on('comment:added', ({ taskId, comment }) => {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, comments: [...(t.comments || []), comment] } : t));
      if (selectedTask?._id === taskId) setSelectedTask(prev => ({ ...prev, comments: [...(prev.comments || []), comment] }));
    });
    socket.on('user:joined', ({ user: u }) => setOnlineUsers(prev => [...prev.filter(x => x._id !== u._id), u]));
    socket.on('user:left', ({ userId }) => setOnlineUsers(prev => prev.filter(u => u._id !== userId)));
  };

  const cleanupSocket = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('leave:project', projectId);
    ['task:created','task:updated','task:deleted','task:moved','comment:added','user:joined','user:left'].forEach(e => socket.off(e));
  };

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.project);
    } catch (err) {
      toast.error('Failed to load project');
    }
  };

  const fetchTasks = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/tasks`);
      setTasks(data.tasks);
    } catch {}
    finally { setLoading(false); }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const task = tasks.find(t => t._id === draggableId);
    if (!task) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t._id === draggableId
      ? { ...t, columnId: destination.droppableId, order: destination.index }
      : t
    ));

    try {
      await api.put(`/projects/${projectId}/tasks/${draggableId}/move`, {
        columnId: destination.droppableId,
        order: destination.index
      });
    } catch {
      fetchTasks(); // Revert
      toast.error('Failed to move task');
    }
  };

  const getTasksForColumn = (columnId) => {
    let filtered = tasks.filter(t => t.columnId === columnId && !t.isArchived);
    if (filter.priority) filtered = filtered.filter(t => t.priority === filter.priority);
    if (filter.assignee) filtered = filtered.filter(t => t.assignees?.some(a => (a._id || a) === filter.assignee));
    return filtered.sort((a, b) => a.order - b.order);
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleTaskUpdated = (updatedTask) => {
    setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    setSelectedTask(updatedTask);
  };

  const handleTaskDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t._id !== taskId));
    setSelectedTask(null);
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100%' }}>
      <div className="spinner" />
    </div>
  );
  if (!project) return <div style={{ padding: 40 }}>Project not found</div>;

  const columns = project.columns?.sort((a, b) => a.order - b.order) || [];

  return (
    <div className="project-page">
      {/* Header */}
      <div className="project-header">
        <div className="project-header-left">
          <div className="project-header-icon" style={{ background: project.color }}>
            {project.icon}
          </div>
          <div>
            <h1 className="project-header-title">{project.name}</h1>
            {project.description && <p className="project-header-desc">{project.description}</p>}
          </div>
        </div>
        <div className="project-header-right">
          {/* Online users */}
          <div className="online-users">
            {onlineUsers.slice(0, 4).map(u => (
              <div key={u._id} className="avatar avatar-sm online" title={`${u.name} is online`}>{getInitials(u.name)}</div>
            ))}
          </div>
          {/* Members */}
          <div className="project-members-row">
            {project.members?.slice(0, 5).map((m, i) => (
              <div key={i} className="avatar avatar-sm" style={{ marginLeft: i > 0 ? -8 : 0 }} title={m.user?.name}>
                {getInitials(m.user?.name)}
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(true)}>
            + Invite
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="project-filters">
        <select className="form-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
          value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })}>
          <option value="">All Priorities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select className="form-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
          value={filter.assignee} onChange={e => setFilter({ ...filter, assignee: e.target.value })}>
          <option value="">All Members</option>
          {project.members?.map(m => (
            <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
          ))}
        </select>
        {(filter.priority || filter.assignee) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ priority: '', assignee: '' })}>
            Clear filters
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 'auto' }}>
          {tasks.filter(t => !t.isArchived).length} tasks total
        </span>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board">
          {columns.map(column => {
            const colTasks = getTasksForColumn(column.id);
            return (
              <div key={column.id} className="column">
                <div className="column-header" style={{ borderTopColor: column.color }}>
                  <div className="column-header-left">
                    <h3 className="column-title">{column.title}</h3>
                    <span className="column-count">{colTasks.length}</span>
                  </div>
                  <button className="column-add-btn" onClick={() => setCreateColumn(column.id)} title="Add task">+</button>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div className={`column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      ref={provided.innerRef} {...provided.droppableProps}>
                      {colTasks.map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              className={`task-card ${snap.isDragging ? 'dragging' : ''}`}
                              onClick={() => setSelectedTask(task)}>
                              {task.labels?.length > 0 && (
                                <div className="task-labels">
                                  {task.labels.map((l, i) => (
                                    <span key={i} className="task-label" style={{ background: l.color + '30', color: l.color }}>{l.name}</span>
                                  ))}
                                </div>
                              )}
                              <div className="task-card-title">{task.title}</div>
                              {task.description && <div className="task-card-desc">{task.description}</div>}
                              <div className="task-card-footer">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                  {task.dueDate && (
                                    <span className={`task-due-badge ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                      📅 {new Date(task.dueDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  {task.comments?.length > 0 && <span className="task-meta-icon">💬 {task.comments.length}</span>}
                                  {task.checklist?.length > 0 && (
                                    <span className="task-meta-icon">✅ {task.checklist.filter(c => c.completed).length}/{task.checklist.length}</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex' }}>
                                  {task.assignees?.slice(0, 3).map((a, i) => (
                                    <div key={i} className="avatar avatar-sm" style={{ marginLeft: i > 0 ? -6 : 0, fontSize: 9 }} title={a.name}>
                                      {getInitials(a.name)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="column-empty" onClick={() => setCreateColumn(column.id)}>
                          <span>+ Add task</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modals */}
      {selectedTask && (
        <TaskModal task={selectedTask} project={project} onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated} onDeleted={handleTaskDeleted} />
      )}
      {createColumn && (
        <CreateTaskModal projectId={projectId} columnId={createColumn} project={project}
          onClose={() => setCreateColumn(null)}
          onCreated={(task) => { setTasks(prev => [...prev, task]); setCreateColumn(null); }} />
      )}
      {showInvite && (
        <InviteMemberModal project={project} onClose={() => setShowInvite(false)}
          onUpdated={setProject} />
      )}
    </div>
  );
}
