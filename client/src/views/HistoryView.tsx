import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCode,
  Terminal,
  Filter
} from 'lucide-react';
import { api } from '../services/api.js';

interface HistoryViewProps {
  onRestoreCode: (code: string, language: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onRestoreCode }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory(50, selectedLang || undefined);
      setJobs(data.jobs || []);
      if (data.jobs && data.jobs.length > 0 && !selectedJob) {
        setSelectedJob(data.jobs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedLang]);

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
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
              <Clock size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Compilation History & Code Snapshots
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Immutable historical records of every compilation attempt, exit code, and diagnostic run.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="select-input"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
            >
              <option value="">All Languages</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Split Table & Detail View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        {/* List of Jobs */}
        <div className="card" style={{ padding: '16px', maxHeight: '680px', overflowY: 'auto' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Recent Compilation Runs ({jobs.length})
          </div>

          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading history...
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No compilation history found. Run programs in the Playground to record your execution activity.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs.map((j) => {
              const isSelected = selectedJob?.id === j.id;
              const isSuccess = j.status === 'completed' && j.exit_code === 0;

              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedJob(j)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--bg-active)' : 'var(--bg-panel)',
                    border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isSuccess ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: 'var(--accent-rose)' }} />
                    )}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {j.language.toUpperCase()} Program
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(j.created_at).toLocaleTimeString()} • {new Date(j.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${isSuccess ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '9px' }}>
                      {isSuccess ? 'EXIT 0' : `CODE ${j.exit_code ?? 'ERR'}`}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {j.exec_time_ms}ms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Job Snapshot & Restorer */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {selectedJob ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Snapshot: {selectedJob.language.toUpperCase()} Execution
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Job ID: {selectedJob.id}
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onRestoreCode(selectedJob.code, selectedJob.language)}
                  id="btn-restore-code"
                >
                  <RotateCcw size={13} />
                  <span>Restore into Playground</span>
                </button>
              </div>

              {/* Source Snapshot */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Source Code Snapshot:
                </div>
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '12px',
                    backgroundColor: '#0d1117',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12.5px',
                    color: '#e6edf3',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {selectedJob.code}
                </div>
              </div>

              {/* Console Output */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Execution Output & Diagnostics:
                </div>
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '12px',
                    backgroundColor: '#090d16',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: selectedJob.exit_code === 0 ? '#7ee787' : '#ff7b72',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {selectedJob.stdout || selectedJob.stderr || '(no console output)'}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Select a compilation record on the left to inspect its code snapshot and output logs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
