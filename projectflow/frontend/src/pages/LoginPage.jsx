import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-logo">⚡</div>
        <h1>ProjectFlow</h1>
        <p>Collaborative project management, simplified</p>
        <div className="auth-features">
          <div className="auth-feature"><span>🗂️</span><span>Kanban boards</span></div>
          <div className="auth-feature"><span>👥</span><span>Team collaboration</span></div>
          <div className="auth-feature"><span>🔔</span><span>Real-time updates</span></div>
          <div className="auth-feature"><span>💬</span><span>Task comments</span></div>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <h2>Sign in</h2>
          <p className="auth-sub">Welcome back to ProjectFlow</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Enter your password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn btn-primary auth-btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : 'Sign in'}
            </button>
          </form>
          <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
          <div className="auth-demo">
            <p>Demo credentials:</p>
            <code>demo@projectflow.com / demo123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
