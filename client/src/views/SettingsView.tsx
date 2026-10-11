import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Key,
  User,
  LogOut,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { api, clearToken } from '../services/api.js';

interface SettingsViewProps {
  user: any;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onOpenAuthModal, onLogout }) => {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(56, 139, 253, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)'
              }}
            >
              <Settings size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Platform Settings & Environment Status
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Real-time inspection of native compilers, execution sandboxes, AI providers, and user credentials.
              </p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Re-scan Environment</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Compilers Status Grid */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Native Compiler & Execution Infrastructure</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {health?.compilers && Object.entries(health.compilers).map(([name, isAvailable]) => (
              <div
                key={name}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={15} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {name.toUpperCase()} Compiler
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isAvailable ? (
                    <span className="badge badge-success" style={{ fontSize: '9px' }}>
                      <CheckCircle2 size={11} />
                      <span>DETECTED & READY</span>
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '9px' }}>
                      <XCircle size={11} />
                      <span>NOT IN PATH</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            * All executions run in isolated ephemeral directories with wall-clock watchdogs (5s default limit), 64KB stdout clamps, and process tree termination.
          </div>
        </div>

        {/* AI Orchestration Status */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} style={{ color: 'var(--accent-purple)' }} />
            <span>AI Orchestration Provider Configuration</span>
          </h3>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Active Diagnostic Provider
              </span>
              <span className={`badge ${health?.aiProvider?.hasKey ? 'badge-success' : 'badge-info'}`}>
                {health?.aiProvider?.hasKey ? 'EXTERNAL LLM CONNECTED' : 'DETERMINISTIC HEURISTIC ENGINE'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Smart Compiler includes a deterministic static analysis & diagnostic engine that categorizes errors, pinpoints source lines, and generates verified fixes with zero external API dependencies.
            </p>
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong>To connect OpenRouter, Groq, or Google Gemini:</strong><br />
            Add your key to the backend <code>.env</code> file:
            <pre style={{ marginTop: '6px', padding: '10px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-sm)', color: '#7ee787', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
AI_PROVIDER=groq
AI_API_KEY=your_groq_or_openrouter_key_here
AI_MODEL=llama-3.3-70b-versatile
            </pre>
          </div>
        </div>

        {/* User Account Card */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} style={{ color: 'var(--accent-blue)' }} />
            <span>Account & Session</span>
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.displayName || 'Guest User'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {user?.email || 'Demo Mode (Local SQLite Persistence)'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {user?.isGuest ? (
                <button className="btn btn-primary btn-sm" onClick={onOpenAuthModal}>
                  <span>Sign In or Register</span>
                </button>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={onLogout}>
                  <LogOut size={13} />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
