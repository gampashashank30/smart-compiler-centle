import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  Sparkles,
  GraduationCap,
  Languages,
  Wrench,
  Clock,
  BarChart3,
  FolderGit2,
  Settings,
  Code2,
  User as UserIcon
} from 'lucide-react';
import { AppView, User } from '../types/index.js';

interface SidebarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  user: User | null;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  user,
  onOpenAuthModal
}) => {
  const navItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'compiler' as AppView, label: 'Code Playground', icon: Terminal },
    { id: 'explanation' as AppView, label: 'AI Explanation', icon: Sparkles },
    { id: 'study' as AppView, label: 'Smart Study Tutor', icon: GraduationCap },
    { id: 'translator' as AppView, label: 'Code Translator', icon: Languages },
    { id: 'improvement' as AppView, label: 'Code Improvement', icon: Wrench },
    { id: 'history' as AppView, label: 'History & Runs', icon: Clock },
    { id: 'analytics' as AppView, label: 'My Progress', icon: BarChart3 },
    { id: 'projects' as AppView, label: 'Projects & Code', icon: FolderGit2 },
    { id: 'settings' as AppView, label: 'Settings & Status', icon: Settings }
  ];

  return (
    <aside className="sidebar">
      <div className="brand-header">
        <div className="brand-icon">
          <Code2 size={18} />
        </div>
        <div>
          <div className="brand-title">Smart Compiler</div>
          <span className="brand-badge">AI Platform</span>
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectView(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-badge" onClick={onOpenAuthModal} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: 'var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
              }}
            >
              <UserIcon size={14} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.displayName || 'Guest User'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {user?.isGuest ? 'Demo Mode' : 'Signed In'}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 600 }}>
            {user?.isGuest ? 'Login' : 'Account'}
          </span>
        </div>
      </div>
    </aside>
  );
};
