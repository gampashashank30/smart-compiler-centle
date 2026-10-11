import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Terminal,
  FileCode,
  Calendar,
  Trash2
} from 'lucide-react';
import { api } from '../services/api.js';
import { SupportedLanguage } from '../types/index.js';

interface ProjectsViewProps {
  onLoadProjectIntoCompiler: (code: string, language: SupportedLanguage) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onLoadProjectIntoCompiler }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('cpp');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      const defaultSnippet = language === 'python'
        ? 'print("My project in Python")'
        : '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "My project" << endl;\n    return 0;\n}';

      await api.createProject({
        title,
        description,
        language,
        code: defaultSnippet
      });

      setShowModal(false);
      setTitle('');
      setDescription('');
      loadProjects();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenProject = async (id: string) => {
    try {
      const p = await api.getProject(id);
      if (p.files && p.files.length > 0) {
        onLoadProjectIntoCompiler(p.files[0].content, p.project.language as SupportedLanguage);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
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
              <FolderGit2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Saved Projects & Workspaces
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Organize, persist, and load saved source code files across sessions.
              </p>
            </div>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading saved projects...
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <FolderGit2 size={40} style={{ color: 'var(--accent-blue)', margin: '0 auto 14px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Saved Projects Yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Create a project to store your algorithms, solutions, or multi-file code.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} />
            <span>Create First Project</span>
          </button>
        </div>
      )}

      {/* Projects Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {projects.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="badge badge-info">{p.language.toUpperCase()}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                </span>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {p.title}
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '16px' }}>
                {p.description || 'No description provided.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenProject(p.id)}
              >
                <Terminal size={13} />
                <span>Open in Playground</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Create New Project
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Project Title
                </label>
                <input
                  type="text"
                  className="text-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Graph Algorithms or DSA Homework"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Language
                </label>
                <select
                  className="select-input"
                  style={{ width: '100%' }}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                >
                  <option value="cpp">C++ (Clang / G++)</option>
                  <option value="c">C (GCC / Clang)</option>
                  <option value="python">Python (3.12)</option>
                  <option value="javascript">JavaScript (Node)</option>
                  <option value="java">Java (JDK)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <textarea
                  className="text-input"
                  style={{ width: '100%', resize: 'none', height: '60px' }}
                  placeholder="Brief notes about this project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
