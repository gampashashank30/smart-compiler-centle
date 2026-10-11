import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Check,
  RefreshCw
} from 'lucide-react';
import { CompilationResult, AIExplanation, SupportedLanguage } from '../types/index.js';
import { api } from '../services/api.js';

interface AIExplanationViewProps {
  currentCode: string;
  language: SupportedLanguage;
  lastCompilationResult: CompilationResult | null;
  onApplyFixToCode: (fixedCode: string) => void;
  onNavigateToCompiler: () => void;
}

export const AIExplanationView: React.FC<AIExplanationViewProps> = ({
  currentCode,
  language,
  lastCompilationResult,
  onApplyFixToCode,
  onNavigateToCompiler
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [explanationDepth, setExplanationDepth] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  // Verification state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [applied, setApplied] = useState<boolean>(false);

  const fetchAnalysis = async (depth = explanationDepth) => {
    setLoading(true);
    setVerificationResult(null);
    setApplied(false);

    try {
      const data = await api.analyze({
        code: currentCode,
        language,
        stdout: lastCompilationResult?.stdout || '',
        stderr: lastCompilationResult?.stderr || '',
        exitCode: lastCompilationResult?.exitCode ?? null,
        diagnostics: lastCompilationResult?.diagnostics || [],
        depth,
        jobId: lastCompilationResult?.jobId
      });
      setExplanation(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [currentCode, language, lastCompilationResult]);

  // Handle Verify Fix
  const handleVerifyFix = async () => {
    if (!explanation?.proposalId) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyAutoFix(explanation.proposalId);
      setVerificationResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Apply Fix
  const handleApplyFix = () => {
    if (!explanation?.proposedCode) return;
    onApplyFixToCode(explanation.proposedCode);
    setApplied(true);
    setTimeout(() => {
      onNavigateToCompiler();
    }, 900);
  };

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 139, 253, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)'
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              AI Root-Cause Diagnostics & Smart Auto-Fix
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Deep-context analysis powered by deterministic static parsing and neural diagnostics.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Audience Depth:</span>
          <select
            className="select-input"
            value={explanationDepth}
            onChange={(e) => {
              const d = e.target.value as any;
              setExplanationDepth(d);
              fetchAnalysis(d);
            }}
          >
            <option value="beginner">Beginner (Friendly analogies)</option>
            <option value="intermediate">Intermediate (Standard technical)</option>
            <option value="advanced">Advanced (Deep compiler mechanics)</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={() => fetchAnalysis(explanationDepth)} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Re-analyze</span>
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
          <Sparkles size={28} className="spin" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px' }}>Analyzing syntax, diagnostics, and constructing minimal verified patch...</div>
        </div>
      )}

      {!loading && explanation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Diagnostic Overview */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent-rose)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-error">{explanation.errorCategory}</span>
                {explanation.lineNumber && (
                  <span className="badge badge-info">Line {explanation.lineNumber}{explanation.columnNumber ? `:${explanation.columnNumber}` : ''}</span>
                )}
                <span className="badge badge-success">
                  {Math.round(explanation.confidence * 100)}% Confidence (Est.)
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Engine: <strong style={{ color: 'var(--accent-cyan)' }}>{explanation.providerUsed}</strong>
              </div>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {explanation.errorSummary}
            </h3>

            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              {explanation.beginnerExplanation}
            </div>

            {/* Why it occurred & Root Cause */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={13} />
                  <span>Technical Root Cause</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {explanation.rootCause}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={13} />
                  <span>Why This Happens in {language.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {explanation.whyOccurred}
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Fix Proposal & Unified Diff */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={16} style={{ color: 'var(--accent-green)' }} />
                  <span>Smart Auto-Fix Proposal</span>
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {explanation.proposedFix}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleVerifyFix}
                  disabled={isVerifying}
                  id="btn-verify-patch"
                >
                  <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>{isVerifying ? 'Verifying in Sandbox...' : 'Verify Fix via Recompilation'}</span>
                </button>

                <button
                  className="btn btn-success btn-sm"
                  onClick={handleApplyFix}
                  disabled={applied}
                  id="btn-apply-patch"
                >
                  {applied ? <Check size={14} /> : <FileCode size={14} />}
                  <span>{applied ? 'Fix Applied!' : 'Apply Fix to Playground'}</span>
                </button>
              </div>
            </div>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  backgroundColor: verificationResult.isResolved ? 'rgba(46, 160, 67, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                  border: `1px solid ${verificationResult.isResolved ? 'rgba(46, 160, 67, 0.4)' : 'rgba(248, 81, 73, 0.4)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                {verificationResult.isResolved ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
                )}
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  <strong>{verificationResult.verificationStatus === 'verified_success' ? 'Verification Passed: ' : 'Verification Incomplete: '}</strong>
                  {verificationResult.message}
                </div>
              </div>
            )}

            {/* Unified Diff View */}
            <div className="diff-container">
              {explanation.patchDiff ? (
                explanation.patchDiff.split('\n').map((line, idx) => {
                  let cls = 'context';
                  if (line.startsWith('+') && !line.startsWith('+++')) cls = 'added';
                  else if (line.startsWith('-') && !line.startsWith('---')) cls = 'removed';
                  return (
                    <div key={idx} className={`diff-line ${cls}`}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '16px', color: 'var(--text-muted)' }}>
                  No modifications proposed.
                </div>
              )}
            </div>
          </div>

          {/* Prevention & Best Practice Advice */}
          <div
            className="card"
            style={{
              backgroundColor: 'rgba(56, 139, 253, 0.05)',
              border: '1px solid rgba(56, 139, 253, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
              <Lightbulb size={16} />
              <strong style={{ fontSize: '13px' }}>How to Avoid This Mistake in Future Code:</strong>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {explanation.preventionTip}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
