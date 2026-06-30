import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import CreateProjectModal from '../components/board/CreateProjectModal';
import './DashboardPage.css';

const PROJECT_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];
const PROJECT_ICONS = ['📋','🚀','💡','🎯','⚡','🔥','💎','🌟','🛠️','📊'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowCreate(true);
      setSearchParams({});
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
      // Fetch tasks assigned to me
      const taskPromises = data.projects.map(p =>
        api.get(`/projects/${p._id}/tasks?assignee=${user._id}`).then(r => r.data.tasks.map(t => ({ ...t, projectName: p.name, projectColor: p.color, projectId: p._id }))).catch(() => [])
      );
      const allTasks = (await Promise.all(taskPromises)).flat();
      setMyTasks(allTasks.filter(t => t.columnId !== 'col-4').slice(0, 8));
    } catch {}
    finally { setLoading(false); }
  };

  const handleProjectCreated = (project) => {
    setProjects(prev => [project, ...prev]);
    navigate(`/projects/${project._id}`);
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const totalTasks = myTasks.length;
  const overdueTasks = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100%' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening with your projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <span>+</span> New Project
        </button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#ede9fe'}}>🗂️</div>
          <div>
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#dbeafe'}}>✅</div>
          <div>
            <div className="stat-value">{totalTasks}</div>
            <div className="stat-label">My Active Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#fee2e2'}}>⚠️</div>
          <div>
            <div className="stat-value">{overdueTasks}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#dcfce7'}}>👥</div>
          <div>
            <div className="stat-value">{[...new Set(projects.flatMap(p => p.members?.map(m => m.user._id)))].length}</div>
            <div className="stat-label">Team Members</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <section>
          <div className="section-header">
            <h2>Your Projects</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(true)}>+ New</button>
          </div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No projects yet</h3>
              <p>Create your first project to get started with collaborative task management</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map(p => (
                <div key={p._id} className="project-card" onClick={() => navigate(`/projects/${p._id}`)}>
                  <div className="project-card-top" style={{ background: p.color || '#6366f1' }}>
                    <span className="project-icon">{p.icon || '📋'}</span>
                    <div className="project-members">
                      {p.members?.slice(0, 4).map((m, i) => (
                        <div key={i} className="avatar avatar-sm" style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid #fff', zIndex: 4-i }}>
                          {getInitials(m.user?.name)}
                        </div>
                      ))}
                      {p.members?.length > 4 && <div className="avatar avatar-sm" style={{ marginLeft: -8, border: '2px solid #fff', background: 'rgba(0,0,0,0.2)' }}>+{p.members.length - 4}</div>}
                    </div>
                  </div>
                  <div className="project-card-body">
                    <h3 className="project-name">{p.name}</h3>
                    {p.description && <p className="project-desc">{p.description}</p>}
                    <div className="project-meta">
                      <span>{p.members?.length} member{p.members?.length !== 1 ? 's' : ''}</span>
                      <span>Updated {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {myTasks.length > 0 && (
          <section>
            <div className="section-header">
              <h2>My Tasks</h2>
            </div>
            <div className="tasks-list">
              {myTasks.map(task => (
                <div key={task._id} className="task-row" onClick={() => navigate(`/projects/${task.projectId}?task=${task._id}`)}>
                  <div className="task-row-left">
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    <span className="task-title">{task.title}</span>
                  </div>
                  <div className="task-row-right">
                    <span className="task-project" style={{ background: task.projectColor + '20', color: task.projectColor }}>
                      {task.projectName}
                    </span>
                    {task.dueDate && (
                      <span className={`task-due ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleProjectCreated} />}
    </div>
  );
}
