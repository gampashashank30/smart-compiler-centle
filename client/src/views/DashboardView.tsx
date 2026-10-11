import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Sparkles,
  GraduationCap,
  Languages,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Code2,
  Cpu
} from 'lucide-react';
import { AppView } from '../types/index.js';
import { api } from '../services/api.js';

interface DashboardViewProps {
  onNavigate: (view: AppView) => void;
  user: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, user }) => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    api.getAnalytics().then(setAnalytics).catch(console.error);
    api.getHistory(5).then(res => setRecentJobs(res.jobs || [])).catch(console.error);
  }, []);

  return (
    <div className="content-body" style={{ padding: '28px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(22, 28, 40, 0.9), rgba(17, 22, 34, 0.95))',
          borderColor: 'var(--border-strong)',
          padding: '28px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-info">Smart Compiler Platform</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>v1.0 Production Ready</span>
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.4px' }}>
              Welcome, {user?.displayName || 'Developer'}!
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.5 }}>
              A smarter way to write, run, understand and improve code. Code with native Clang, GCC, and Python compilers, diagnose root causes with AI, and master core concepts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('compiler')} id="dashboard-launch-btn">
              <Terminal size={15} />
              <span>Open Code Playground</span>
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('study')}>
              <GraduationCap size={15} />
              <span>Start Smart Study</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            TOTAL EXECUTIONS
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {analytics?.totalCompilations || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Recorded compilation jobs
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            SUCCESS RATE
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-green)' }}>
            {analytics?.successRate || 0}%
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Clean zero-error runs
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            STUDY QUIZ ACCURACY
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-purple)' }}>
            {analytics?.studyStats?.accuracyRate || 0}%
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Concept mastery score
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            VERIFIED AUTO-FIXES
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {analytics?.autoFixStats?.verifiedSuccess || 0}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Recompiled & verified patches
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
        Core Platform Modules
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Compiler */}
        <div
          className="card"
          onClick={() => onNavigate('compiler')}
          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Terminal size={18} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Code Playground</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Professional Monaco editor with C, C++, Python, and Node execution sandbox.
          </p>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Launch Editor</span>
            <ArrowRight size={13} />
          </span>
        </div>

        {/* AI Explanation */}
        <div
          className="card"
          onClick={() => onNavigate('explanation')}
          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Root-Cause</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Explain compiler errors, pinpoint lines, generate diffs, and auto-verify fixes.
          </p>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Explore Diagnostics</span>
            <ArrowRight size={13} />
          </span>
        </div>

        {/* Smart Study */}
        <div
          className="card"
          onClick={() => onNavigate('study')}
          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <GraduationCap size={18} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Smart Study Tutor</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Structured 4-stage learning with quizzes, guided paths, and applied challenges.
          </p>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Start Learning</span>
            <ArrowRight size={13} />
          </span>
        </div>

        {/* Code Translator */}
        <div
          className="card"
          onClick={() => onNavigate('translator')}
          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Languages size={18} style={{ color: 'var(--accent-green)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Code Translator</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Convert algorithms between C, C++, Python, and JS with sandbox validation.
          </p>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Translate Code</span>
            <ArrowRight size={13} />
          </span>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Execution Activity
          </h3>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('history')}>
            <span>View Full History</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No recent activity recorded. Click "Open Code Playground" to start writing and executing code.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentJobs.map((j) => {
              const isSuccess = j.status === 'completed' && j.exit_code === 0;
              return (
                <div
                  key={j.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isSuccess ? (
                      <CheckCircle2 size={15} style={{ color: 'var(--accent-green)' }} />
                    ) : (
                      <AlertTriangle size={15} style={{ color: 'var(--accent-rose)' }} />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {j.language.toUpperCase()} Execution
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {new Date(j.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <span className={`badge ${isSuccess ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '9px' }}>
                    {isSuccess ? 'EXIT 0' : `CODE ${j.exit_code ?? 'ERR'}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
