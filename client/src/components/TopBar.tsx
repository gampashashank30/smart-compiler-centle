import React from 'react';
import { AppView } from '../types/index.js';
import { ShieldCheck, Cpu, Terminal } from 'lucide-react';

interface TopBarProps {
  currentView: AppView;
  compilerHealth: any;
  onQuickRun?: () => void;
  isRunning?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  compilerHealth,
  onQuickRun,
  isRunning
}) => {
  const titles: Record<AppView, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview, learning progress, and recent activity' },
    compiler: { title: 'Code Playground', subtitle: 'Native Clang, GCC, Python, and Node execution sandbox' },
    explanation: { title: 'AI Root-Cause Explanation', subtitle: 'Diagnostic mapping, error analysis, and verified auto-fix' },
    study: { title: 'Smart Study Coding Tutor', subtitle: '4-stage interactive learning, quizzes, and applied practice' },
    translator: { title: 'Code Translator', subtitle: 'Multi-language conversion with native execution validation' },
    improvement: { title: 'Code Improvement', subtitle: 'Complexity audit, refactoring, unit tests, and edge cases' },
    history: { title: 'Compilation History', subtitle: 'Versioned snapshots, diagnostic logs, and restore points' },
    analytics: { title: 'My Progress & Analytics', subtitle: 'Real execution metrics, recurring mistakes, and quiz accuracy' },
    projects: { title: 'Projects & Workspaces', subtitle: 'Saved multi-file source projects' },
    settings: { title: 'Platform Settings', subtitle: 'Environment status, API keys, and compiler verification' }
  };

  const info = titles[currentView] || { title: 'Smart Compiler', subtitle: '' };

  const compilersAvailable = compilerHealth?.compilers
    ? Object.entries(compilerHealth.compilers)
        .filter(([_, ok]) => ok)
        .map(([name]) => name.toUpperCase())
        .join(', ')
    : 'NATIVE LLVM/GCC/PYTHON';

  return (
    <header className="top-bar">
      <div>
        <span className="top-title">{info.title}</span>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: '12px' }}>
          {info.subtitle}
        </span>
      </div>

      <div className="top-actions">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-panel)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}
          title="Detected native host compilers in PATH"
        >
          <Cpu size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span>Active Compilers: <strong style={{ color: 'var(--accent-green)' }}>{compilersAvailable}</strong></span>
        </div>

        {currentView === 'compiler' && onQuickRun && (
          <button
            className={`btn btn-sm ${isRunning ? 'btn-danger' : 'btn-primary'}`}
            onClick={onQuickRun}
            id="top-run-btn"
          >
            <Terminal size={14} />
            <span>{isRunning ? 'Cancel Running' : 'Run Program'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
