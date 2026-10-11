import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Square,
  Sparkles,
  ShieldCheck,
  Wrench,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { SupportedLanguage, CompilationResult, PrecheckReport } from '../types/index.js';
import { LANGUAGE_CONFIGS, TEMPLATES } from '../utils/constants.js';
import { api } from '../services/api.js';

interface CompilerViewProps {
  code: string;
  setCode: (code: string) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  stdin: string;
  setStdin: (stdin: string) => void;
  onNavigateToExplanation: (result: CompilationResult) => void;
  onNavigateToAutoFix: (result: CompilationResult) => void;
}

export const CompilerView: React.FC<CompilerViewProps> = ({
  code,
  setCode,
  language,
  setLanguage,
  stdin,
  setStdin,
  onNavigateToExplanation,
  onNavigateToAutoFix
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [precheckReport, setPrecheckReport] = useState<PrecheckReport | null>(null);
  const [isPrechecking, setIsPrechecking] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'output' | 'diagnostics' | 'precheck' | 'stdin'>('output');

  // Editor display preferences
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [minimap, setMinimap] = useState<boolean>(false);

  const langConfig = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.cpp;

  // Run Code
  const handleRunCode = async () => {
    if (isRunning && activeJobId) {
      // Cancel
      try {
        await api.cancelCompile(activeJobId);
      } catch (e) {
        console.error(e);
      }
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    setActiveOutputTab('output');

    try {
      const execResult = await api.compile({
        language,
        code,
        stdin
      });
      setResult(execResult);
      setActiveJobId(null);

      // If errors were encountered, also run deterministic precheck to assist student
      if (execResult.status !== 'completed' || execResult.exitCode !== 0) {
        runPrecheck();
      }
    } catch (err: any) {
      setResult({
        jobId: 'err-client',
        status: 'failed',
        exitCode: 1,
        stdout: '',
        stderr: err.message || 'Execution failed to connect to server.',
        compileTimeMs: 0,
        execTimeMs: 0,
        diagnostics: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Run Precheck
  const runPrecheck = async () => {
    setIsPrechecking(true);
    try {
      const rep = await api.precheck({ code, language });
      setPrecheckReport(rep);
      if (rep.totalFindings > 0) {
        setActiveOutputTab('precheck');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrechecking(false);
    }
  };

  // Language Change
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    // If current code matches previous default or is very short, populate template
    setCode(LANGUAGE_CONFIGS[newLang].defaultCode);
    setResult(null);
    setPrecheckReport(null);
  };

  // Template select
  const handleTemplateSelect = (templateCode: string) => {
    setCode(templateCode);
    setResult(null);
    setPrecheckReport(null);
  };

  // Download code
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `main${langConfig.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Upload code
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCode(content);
        // Detect language by extension
        if (file.name.endsWith('.cpp') || file.name.endsWith('.cc')) setLanguage('cpp');
        else if (file.name.endsWith('.c')) setLanguage('c');
        else if (file.name.endsWith('.py')) setLanguage('python');
        else if (file.name.endsWith('.js')) setLanguage('javascript');
        else if (file.name.endsWith('.java')) setLanguage('java');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="compiler-workspace">
      {/* Left Pane: Editor */}
      <div className="editor-pane">
        <div className="pane-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="select-input"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
              id="compiler-language-select"
            >
              <option value="cpp">C++ (Clang / G++ 17)</option>
              <option value="c">C (GCC / Clang)</option>
              <option value="python">Python (3.12)</option>
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="java">Java (JDK)</option>
            </select>

            {/* Template selector */}
            {TEMPLATES[language] && (
              <select
                className="select-input"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleTemplateSelect(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>Load Example Template...</option>
                {TEMPLATES[language].map((t) => (
                  <option key={t.label} value={t.code}>{t.label}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={runPrecheck}
              title="Run deterministic syntax and special character precheck"
              id="compiler-precheck-btn"
            >
              <ShieldCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>Precheck Syntax</span>
            </button>

            <button
              className={`btn btn-sm ${isRunning ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleRunCode}
              id="compiler-run-btn"
            >
              {isRunning ? <Square size={14} /> : <Play size={14} />}
              <span>{isRunning ? 'Stop' : 'Run Code'}</span>
            </button>

            <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
              <Upload size={13} />
              <input type="file" onChange={handleUpload} style={{ display: 'none' }} accept=".c,.cpp,.py,.js,.java,.txt" />
            </label>

            <button className="btn btn-sm btn-secondary" onClick={handleDownload} title="Download Source File">
              <Download size={13} />
            </button>

            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setCode(langConfig.defaultCode)}
              title="Reset to template"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Editor
            height="100%"
            language={langConfig.monacoLang}
            value={code}
            onChange={(val) => setCode(val || '')}
            theme="vs-dark"
            options={{
              fontSize,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              wordWrap,
              minimap: { enabled: minimap },
              bracketPairColorization: { enabled: true },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 4,
              formatOnPaste: true,
              lineNumbers: 'on',
              folding: true
            }}
          />
        </div>

        {/* Editor bottom bar */}
        <div
          style={{
            height: '28px',
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span>Lines: {code.split('\n').length}</span>
            <span>Chars: {code.length}</span>
            <span>Encoding: UTF-8</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span
              style={{ cursor: 'pointer', color: wordWrap === 'on' ? 'var(--accent-cyan)' : 'inherit' }}
              onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
            >
              Wrap: {wordWrap}
            </span>
            <span
              style={{ cursor: 'pointer', color: minimap ? 'var(--accent-cyan)' : 'inherit' }}
              onClick={() => setMinimap(!minimap)}
            >
              Minimap: {minimap ? 'ON' : 'OFF'}
            </span>
            <span>Size: {fontSize}px</span>
          </div>
        </div>
      </div>

      {/* Right Pane: Output, Diagnostics, Stdin & Precheck */}
      <div className="output-pane">
        <div className="output-tabs">
          <div
            className={`output-tab ${activeOutputTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveOutputTab('output')}
            id="tab-output"
          >
            <Terminal size={14} />
            <span>Output Console</span>
            {result && (
              <span className={`badge ${result.status === 'completed' && result.exitCode === 0 ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                {result.status === 'completed' && result.exitCode === 0 ? 'EXIT 0' : `EXIT ${result.exitCode ?? 'FAIL'}`}
              </span>
            )}
          </div>

          <div
            className={`output-tab ${activeOutputTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveOutputTab('diagnostics')}
            id="tab-diagnostics"
          >
            <AlertTriangle size={14} />
            <span>Diagnostics</span>
            {result?.diagnostics && result.diagnostics.length > 0 && (
              <span className="badge badge-error" style={{ fontSize: '9px', padding: '1px 5px' }}>
                {result.diagnostics.length}
              </span>
            )}
          </div>

          <div
            className={`output-tab ${activeOutputTab === 'precheck' ? 'active' : ''}`}
            onClick={() => setActiveOutputTab('precheck')}
            id="tab-precheck"
          >
            <ShieldCheck size={14} />
            <span>Precheck</span>
            {precheckReport && precheckReport.totalFindings > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>
                {precheckReport.totalFindings}
              </span>
            )}
          </div>

          <div
            className={`output-tab ${activeOutputTab === 'stdin' ? 'active' : ''}`}
            onClick={() => setActiveOutputTab('stdin')}
            id="tab-stdin"
          >
            <Layers size={14} />
            <span>Program Input (stdin)</span>
            {stdin.trim().length > 0 && (
              <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 5px' }}>
                SET
              </span>
            )}
          </div>
        </div>

        {/* Action helper bar if error occurred */}
        {result && (result.status !== 'completed' || result.exitCode !== 0) && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
              borderBottom: '1px solid rgba(248, 81, 73, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--accent-rose)' }}>
              <AlertTriangle size={15} />
              <span>Compilation or runtime error detected.</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onNavigateToExplanation(result)}
                id="btn-explain-error"
              >
                <Sparkles size={13} />
                <span>Explain Error with AI</span>
              </button>

              <button
                className="btn btn-sm btn-success"
                onClick={() => onNavigateToAutoFix(result)}
                id="btn-auto-fix"
              >
                <Wrench size={13} />
                <span>Smart Auto-Fix</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Output Console */}
        {activeOutputTab === 'output' && (
          <div className="output-console" id="console-output-box">
            {isRunning && (
              <div style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={14} className="spin" />
                <span>Compiling and executing in isolated sandbox...</span>
              </div>
            )}

            {!result && !isRunning && (
              <div style={{ color: 'var(--text-muted)' }}>
                Press "Run Code" (or Ctrl+Enter) to compile and execute your program.<br />
                Output will appear here with execution timings, exit status, and memory safety checks.
              </div>
            )}

            {result && (
              <>
                {result.stdout && (
                  <div style={{ color: '#e6edf3', marginBottom: '12px' }}>
                    {result.stdout}
                  </div>
                )}

                {result.stderr && (
                  <div style={{ color: '#ff7b72', marginBottom: '12px' }}>
                    {result.stderr}
                  </div>
                )}

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <span>Status: <strong style={{ color: result.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-rose)' }}>{result.status.toUpperCase()}</strong></span>
                  <span>Exit Code: <strong>{result.exitCode ?? 'N/A'}</strong></span>
                  {result.compileTimeMs > 0 && <span>Compile: {result.compileTimeMs}ms</span>}
                  <span>Execution: {result.execTimeMs}ms</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Diagnostics */}
        {activeOutputTab === 'diagnostics' && (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {(!result?.diagnostics || result.diagnostics.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No compiler diagnostics recorded. If your program fails, parsed compiler lines will show here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.diagnostics.map((d, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-strong)',
                      borderLeft: '4px solid var(--accent-rose)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-rose)' }}>
                        {d.severity.toUpperCase()} {d.line ? `[Line ${d.line}${d.column ? `:${d.column}` : ''}]` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {d.message}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {d.raw}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Precheck */}
        {activeOutputTab === 'precheck' && (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Deterministic Special Character & Syntax Precheck
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Lexer-aware scan checking unmatched delimiters, missing semicolons, and includes.
                </p>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={runPrecheck} disabled={isPrechecking}>
                {isPrechecking ? 'Checking...' : 'Recheck Code'}
              </button>
            </div>

            {precheckReport && precheckReport.totalFindings === 0 && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(46, 160, 67, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(46, 160, 67, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  All delimiter pairs matched, statement terminators verified, and no syntax precheck warnings found!
                </span>
              </div>
            )}

            {precheckReport && precheckReport.findings.map((f, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '10px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `4px solid ${f.severity === 'error' ? 'var(--accent-rose)' : 'var(--accent-amber)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: f.severity === 'error' ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>
                    {f.category} (Line {f.line}, Col {f.column})
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {f.message}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
                  💡 Recommendation: {f.recommendedCorrection}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Program Stdin */}
        {activeOutputTab === 'stdin' && (
          <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Provide standard input lines for programs using <code>cin</code>, <code>scanf</code>, or <code>input()</code>:
            </div>
            <textarea
              className="text-input"
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                resize: 'none',
                lineHeight: 1.5
              }}
              placeholder="Enter input values here..."
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              id="compiler-stdin-input"
            />
          </div>
        )}
      </div>
    </div>
  );
};
