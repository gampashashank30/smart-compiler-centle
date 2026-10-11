import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Wrench,
  Activity,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { SupportedLanguage } from '../types/index.js';
import { api } from '../services/api.js';

interface ImprovementViewProps {
  initialCode: string;
  language: SupportedLanguage;
}

export const ImprovementView: React.FC<ImprovementViewProps> = ({ initialCode, language }) => {
  const [code, setCode] = useState<string>(initialCode);
  const [activeAction, setActiveAction] = useState<'complexity' | 'refactor' | 'readability' | 'tests' | 'edge_cases'>('complexity');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleImprove = async (action: 'complexity' | 'refactor' | 'readability' | 'tests' | 'edge_cases') => {
    setActiveAction(action);
    setLoading(true);
    try {
      const res = await api.improve({
        language,
        actionType: action,
        code
      });
      setResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.improvedCode) {
      navigator.clipboard.writeText(result.improvedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
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
              <Wrench size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Code Improvement & Algorithmic Optimization
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Time & Space complexity audit, refactoring, unit test generation, and defensive edge-case reviews.
              </p>
            </div>
          </div>

          {/* Action Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${activeAction === 'complexity' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImprove('complexity')}
              disabled={loading}
              id="btn-improve-complexity"
            >
              <Activity size={13} />
              <span>Complexity (Big-O)</span>
            </button>

            <button
              className={`btn btn-sm ${activeAction === 'refactor' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImprove('refactor')}
              disabled={loading}
            >
              <Sparkles size={13} />
              <span>Refactor</span>
            </button>

            <button
              className={`btn btn-sm ${activeAction === 'readability' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImprove('readability')}
              disabled={loading}
            >
              <CheckCircle2 size={13} />
              <span>Readability</span>
            </button>

            <button
              className={`btn btn-sm ${activeAction === 'tests' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImprove('tests')}
              disabled={loading}
            >
              <FileCheck size={13} />
              <span>Generate Tests</span>
            </button>

            <button
              className={`btn btn-sm ${activeAction === 'edge_cases' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImprove('edge_cases')}
              disabled={loading}
            >
              <ShieldAlert size={13} />
              <span>Edge Cases</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Analysis Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        {/* Source Code */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Source Code ({language.toUpperCase()})
            </span>
            <span className="badge badge-info">Active Code</span>
          </div>

          <div style={{ height: '420px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={(v) => setCode(v || '')}
              theme="vs-dark"
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>
        </div>

        {/* Improvement Analysis & Output */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Analysis & Optimized Output
            </span>
            {result?.improvedCode && (
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Sparkles size={24} className="spin" />
              <span style={{ marginLeft: '10px', fontSize: '13px' }}>Analyzing algorithmic structures...</span>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
              {/* Notes Banner */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {result.analysisNotes}
              </div>

              {/* Improved Code if different */}
              {result.improvedCode !== code && (
                <div style={{ height: '240px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <Editor
                    height="100%"
                    language={language === 'cpp' ? 'cpp' : language}
                    value={result.improvedCode}
                    theme="vs-dark"
                    options={{ fontSize: 13, readOnly: true, minimap: { enabled: false } }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
              Select an action above (Complexity, Refactor, Readability, Tests, or Edge Cases) to audit and optimize your code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
