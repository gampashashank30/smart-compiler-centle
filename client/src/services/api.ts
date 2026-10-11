const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('smart_compiler_token');
}

export function setToken(token: string): void {
  localStorage.setItem('smart_compiler_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('smart_compiler_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health
  getHealth: () => request<any>('/health'),

  // Auth
  register: (data: { email: string; password: string; displayName: string }) =>
    request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  guestLogin: () =>
    request<{ token: string; user: any }>('/auth/guest', { method: 'POST' }),
  getMe: () => request<{ user: any }>('/auth/me'),

  // Compiler
  compile: (data: { language: string; code: string; stdin?: string; timeoutMs?: number; projectId?: string }) =>
    request<any>('/compile', { method: 'POST', body: JSON.stringify(data) }),
  cancelCompile: (jobId: string) =>
    request<any>(`/compile/${jobId}/cancel`, { method: 'POST' }),
  getCompileJob: (jobId: string) =>
    request<any>(`/compile/${jobId}`),

  // Precheck
  precheck: (data: { code: string; language: string }) =>
    request<any>('/precheck', { method: 'POST', body: JSON.stringify(data) }),

  // AI & Auto-Fix
  analyze: (data: { code: string; language: string; stdout?: string; stderr?: string; exitCode?: number | null; diagnostics?: any[]; depth?: string; jobId?: string }) =>
    request<any>('/analyze', { method: 'POST', body: JSON.stringify(data) }),
  verifyAutoFix: (proposalId: string) =>
    request<any>('/autofix/verify', { method: 'POST', body: JSON.stringify({ proposalId }) }),

  // Smart Study
  createStudySession: (data: { topic: string; language: string; level: string; userCode?: string; errorSnippet?: string }) =>
    request<any>('/study/session', { method: 'POST', body: JSON.stringify(data) }),
  getStudySession: (id: string) =>
    request<any>(`/study/session/${id}`),
  submitQuiz: (quizId: string, userAnswer: number) =>
    request<any>('/study/quiz/submit', { method: 'POST', body: JSON.stringify({ quizId, userAnswer }) }),
  updateStudyStage: (id: string, stage: number) =>
    request<any>(`/study/session/${id}/stage`, { method: 'POST', body: JSON.stringify({ stage }) }),

  // Translator
  translate: (data: { sourceLang: string; targetLang: string; sourceCode: string }) =>
    request<any>('/translate', { method: 'POST', body: JSON.stringify(data) }),

  // Code Improvement
  improve: (data: { language: string; actionType: string; code: string }) =>
    request<any>('/improve', { method: 'POST', body: JSON.stringify(data) }),

  // History & Projects
  getHistory: (limit = 50, language?: string) =>
    request<{ jobs: any[] }>(`/history?limit=${limit}${language ? `&language=${language}` : ''}`),
  getProjects: () =>
    request<{ projects: any[] }>('/projects'),
  createProject: (data: { title: string; description?: string; language: string; code: string }) =>
    request<{ projectId: string }>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  getProject: (id: string) =>
    request<any>(`/projects/${id}`),

  // Analytics
  getAnalytics: () =>
    request<any>('/analytics')
};
