import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  Zap,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api.js';

export const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
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
              <BarChart3 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                My Progress & Recurring Mistakes Engine
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Track execution success rate, language distribution, and recurring error categories over time.
              </p>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RotateCcw size={13} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading real activity analytics...
        </div>
      )}

      {!loading && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Total Compilations */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                TOTAL COMPILATIONS
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {analytics.totalCompilations}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Sandbox executions recorded
              </div>
            </div>

            {/* Success Rate */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                COMPILATION SUCCESS RATE
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '4px' }}>
                {analytics.successRate}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {analytics.successfulCompilations} exit code 0 / {analytics.failedCompilations} failed
              </div>
            </div>

            {/* Quiz Accuracy */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                STUDY QUIZ ACCURACY
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '4px' }}>
                {analytics.studyStats?.accuracyRate || 0}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {analytics.studyStats?.correctQuizzes || 0} correct of {analytics.studyStats?.totalQuizzesTaken || 0} attempted
              </div>
            </div>

            {/* Verified Auto-Fixes */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                VERIFIED AUTO-FIXES
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                {analytics.autoFixStats?.verifiedSuccess || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Patches verified via recompilation
              </div>
            </div>
          </div>

          {/* Languages Breakdown & Recurring Mistakes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Languages Used */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Language Activity Breakdown
              </h3>

              {analytics.languagesUsed.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  No language execution data yet. Run programs in C, C++, Python, or JavaScript to see distribution.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analytics.languagesUsed.map((l: any) => {
                    const percentage = Math.round((l.count / analytics.totalCompilations) * 100);
                    return (
                      <div key={l.language}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {l.language.toUpperCase()}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {l.count} runs ({percentage}%)
                          </span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'var(--bg-panel)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--accent-blue)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recurring Mistakes Engine */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--accent-rose)' }} />
                <span>Recurring Mistake Categories</span>
              </h3>

              {analytics.recurringMistakes.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  No recurring error patterns detected. Great job keeping your code clean!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analytics.recurringMistakes.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-rose)' }}>
                          {m.errorCategory}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Language: {m.language.toUpperCase()} • Last seen: {new Date(m.lastOccurred).toLocaleDateString()}
                        </div>
                      </div>

                      <span className="badge badge-error" style={{ fontSize: '10px' }}>
                        {m.count} {m.count === 1 ? 'Time' : 'Times'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
