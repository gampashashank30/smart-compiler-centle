export type AppView =
  | 'dashboard'
  | 'compiler'
  | 'explanation'
  | 'study'
  | 'translator'
  | 'improvement'
  | 'history'
  | 'analytics'
  | 'projects'
  | 'settings';

export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'javascript' | 'java';

export interface CodeTemplate {
  name: string;
  code: string;
}

export interface User {
  id: string;
  email?: string;
  displayName: string;
  isGuest: boolean;
}

export interface CompilationResult {
  jobId: string;
  status: 'completed' | 'failed' | 'timed_out' | 'cancelled';
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compileTimeMs: number;
  execTimeMs: number;
  diagnostics: Array<{
    line?: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    raw: string;
  }>;
}

export interface PrecheckReport {
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  findings: Array<{
    type: string;
    category: string;
    severity: 'error' | 'warning' | 'info';
    line: number;
    column: number;
    message: string;
    recommendedCorrection: string;
  }>;
}

export interface AIExplanation {
  analysisId?: string;
  proposalId?: string;
  errorCategory: string;
  errorSummary: string;
  rootCause: string;
  lineNumber?: number;
  columnNumber?: number;
  whyOccurred: string;
  beginnerExplanation: string;
  proposedFix: string;
  proposedCode: string;
  patchDiff: string;
  preventionTip: string;
  confidence: number;
  providerUsed: string;
}
