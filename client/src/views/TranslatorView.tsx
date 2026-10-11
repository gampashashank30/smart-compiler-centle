import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Languages,
  ArrowRight,
  Play,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Check
} from 'lucide-react';
import { SupportedLanguage } from '../types/index.js';
import { api } from '../services/api.js';

interface TranslatorViewProps {
  initialCode: string;
  initialLang: SupportedLanguage;
}

export const TranslatorView: React.FC<TranslatorViewProps> = ({ initialCode, initialLang }) => {
  const [sourceLang, setSourceLang] = useState<SupportedLanguage>(initialLang);
  const [targetLang, setTargetLang] = useState<SupportedLanguage>('python');
  const [sourceCode, setSourceCode] = useState<string>(initialCode);
  const [translatedCode, setTranslatedCode] = useState<string>('');
  const [differencesExplanation, setDifferencesExplanation] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleTranslate = async () => {
    setLoading(true);
    setValidationResult(null);
    try {
      const res = await api.translate({
        sourceLang,
        targetLang,
        sourceCode
      });
      setTranslatedCode(res.translatedCode);
      setDifferencesExplanation(res.differencesExplanation);
      setValidationResult(res.validationResult);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Header Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(57, 197, 207, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}
            >
              <Languages size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Multi-Language Code Translator
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Preserves algorithmic intent, typing contracts, and validates syntax in the execution sandbox.
              </p>
            </div>
          </div>

          {/* Language Selection & Translate CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select
              className="select-input"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as SupportedLanguage)}
            >
              <option value="c">Source: C</option>
              <option value="cpp">Source: C++</option>
              <option value="python">Source: Python</option>
              <option value="javascript">Source: JavaScript</option>
              <option value="java">Source: Java</option>
            </select>

            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />

            <select
              className="select-input"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as SupportedLanguage)}
            >
              <option value="python">Target: Python</option>
              <option value="cpp">Target: C++</option>
              <option value="c">Target: C</option>
              <option value="javascript">Target: JavaScript</option>
              <option value="java">Target: Java</option>
            </select>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleTranslate}
              disabled={loading}
              id="btn-translate-code"
            >
              <Languages size={14} />
              <span>{loading ? 'Translating & Validating...' : 'Translate & Validate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side Editors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {/* Left: Source Code */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Source Code ({sourceLang.toUpperCase()})
            </span>
            <span className="badge badge-info">Input</span>
          </div>

          <div style={{ height: '360px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <Editor
              height="100%"
              language={sourceLang === 'cpp' ? 'cpp' : sourceLang}
              value={sourceCode}
              onChange={(v) => setSourceCode(v || '')}
              theme="vs-dark"
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>
        </div>

        {/* Right: Translated Code */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Target Implementation ({targetLang.toUpperCase()})
              </span>
              {validationResult && (
                <span className={`badge ${validationResult.status === 'completed' && validationResult.exitCode === 0 ? 'badge-success' : 'badge-warning'}`}>
                  {validationResult.status === 'completed' && validationResult.exitCode === 0 ? 'SANDBOX VERIFIED' : 'TESTING REQUIRED'}
                </span>
              )}
            </div>

            {translatedCode && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ height: '360px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <Editor
              height="100%"
              language={targetLang === 'cpp' ? 'cpp' : targetLang}
              value={translatedCode || '// Click "Translate & Validate" above to generate target code'}
              onChange={(v) => setTranslatedCode(v || '')}
              theme="vs-dark"
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>
        </div>
      </div>

      {/* Language Differences & Sandbox Verification Result */}
      {translatedCode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Differences panel */}
          <div className="card">
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={16} />
              <span>Language Differences & Idioms</span>
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {differencesExplanation}
            </div>
          </div>

          {/* Sandbox Validation */}
          <div className="card">
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              <span>Native Sandbox Verification Output</span>
            </h3>

            {validationResult ? (
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '6px' }}>
                  Exit Status: <strong>{validationResult.status.toUpperCase()}</strong> (Code {validationResult.exitCode ?? 'N/A'})
                </div>
                {validationResult.stdout && (
                  <div style={{ padding: '10px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-sm)', color: '#7ee787', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    {validationResult.stdout}
                  </div>
                )}
                {validationResult.stderr && (
                  <div style={{ padding: '10px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-sm)', color: '#ff7b72', fontFamily: 'var(--font-mono)' }}>
                    {validationResult.stderr}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No active execution run.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
