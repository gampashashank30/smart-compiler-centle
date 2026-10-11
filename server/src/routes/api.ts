import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { dbAll, dbGet, dbRun } from '../db/index.js';
import { AuthenticatedRequest, generateToken } from '../middleware/auth.js';
import { runCode, cancelJob, ExecutionResult } from '../services/sandbox.js';
import { performCodePrecheck } from '../services/precheck.js';
import { analyzeCodeError } from '../services/aiOrchestrator.js';
import { verifyAutoFixProposal } from '../services/autoFix.js';
import { createStudySession, getStudySession, submitQuizAnswer, updateSessionStage } from '../services/study.js';
import { translateCode } from '../services/translator.js';
import { improveCode } from '../services/improvement.js';
import { getUserAnalytics, recordMistake } from '../services/analytics.js';
import { spawnSync } from 'child_process';

const router = Router();

// ==========================================
// 1. System Health & Environment Check
// ==========================================
router.get('/health', async (req, res) => {
  const checkCmd = (cmd: string, args: string[]): boolean => {
    try {
      const p = spawnSync(cmd, args, { timeout: 2000, shell: false });
      return p.status === 0;
    } catch {
      return false;
    }
  };

  const compilers = {
    gcc: checkCmd('gcc', ['--version']),
    gpp: checkCmd('g++', ['--version']),
    clang: checkCmd('clang', ['--version']),
    python: checkCmd('python', ['--version']),
    node: checkCmd('node', ['-v']),
    java: checkCmd('javac', ['-version'])
  };

  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    aiProvider: {
      configured: !!CONFIG.AI.API_KEY,
      provider: CONFIG.AI.PROVIDER,
      model: CONFIG.AI.MODEL,
      hasKey: !!CONFIG.AI.API_KEY
    },
    compilers
  });
});

// ==========================================
// 2. Authentication & User Profile
// ==========================================
router.post('/auth/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'Email, password, and display name are required.' });
    return;
  }

  const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    res.status(400).json({ error: 'An account with this email already exists.' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const userId = uuidv4();
  const now = new Date().toISOString();

  await dbRun(
    'INSERT INTO users (id, email, password_hash, display_name, is_guest, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [userId, email, passwordHash, displayName, now]
  );

  const token = generateToken({ id: userId, email, displayName, isGuest: false });
  res.json({ token, user: { id: userId, email, displayName, isGuest: false } });
});

router.post('/auth/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = await dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    isGuest: !!user.is_guest
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      isGuest: !!user.is_guest
    }
  });
});

router.post('/auth/guest', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const guestId = `guest-${uuidv4().substring(0, 8)}`;
  const displayName = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  await dbRun(
    'INSERT INTO users (id, display_name, is_guest, created_at) VALUES (?, ?, 1, ?)',
    [guestId, displayName, now]
  );

  const token = generateToken({ id: guestId, displayName, isGuest: true });
  res.json({ token, user: { id: guestId, displayName, isGuest: true } });
});

router.get('/auth/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// ==========================================
// 3. Compiler Execution & Cancellation
// ==========================================
router.post('/compile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { language, code, stdin, timeoutMs, projectId } = req.body;

  if (!language || !code) {
    res.status(400).json({ error: 'Language and source code are required.' });
    return;
  }

  const jobId = uuidv4();
  const startTime = new Date().toISOString();

  // Create initial queued job in DB
  await dbRun(
    `INSERT INTO compilation_jobs (
      id, user_id, project_id, language, code, stdin, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'running', ?)`,
    [jobId, userId, projectId || null, language, code, stdin || '', startTime]
  );

  try {
    const execResult = await runCode(
      { language, code, stdin, timeoutMs },
      jobId
    );

    const finishTime = new Date().toISOString();

    // Persist full execution results
    await dbRun(
      `UPDATE compilation_jobs SET
        status = ?, exit_code = ?, stdout = ?, stderr = ?,
        compile_time_ms = ?, exec_time_ms = ?, diagnostics = ?, finished_at = ?
      WHERE id = ?`,
      [
        execResult.status,
        execResult.exitCode,
        execResult.stdout,
        execResult.stderr,
        execResult.compileTimeMs,
        execResult.execTimeMs,
        JSON.stringify(execResult.diagnostics),
        finishTime,
        jobId
      ]
    );

    // Track recurring mistake if execution failed
    if (execResult.status !== 'completed' || execResult.exitCode !== 0) {
      const errCat = execResult.diagnostics[0]?.message || 'Runtime/Compilation Error';
      await recordMistake(userId, language, errCat.substring(0, 80), code);
    }

    res.json(execResult);
  } catch (err: any) {
    res.status(500).json({
      jobId,
      status: 'failed',
      exitCode: 1,
      stdout: '',
      stderr: `Internal execution error: ${err.message}`,
      compileTimeMs: 0,
      execTimeMs: 0,
      diagnostics: []
    });
  }
});

router.post('/compile/:jobId/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const jobId = req.params.jobId as string;
  const cancelled = cancelJob(jobId);
  if (cancelled) {
    await dbRun("UPDATE compilation_jobs SET status = 'cancelled' WHERE id = ?", [jobId]);
    res.json({ message: 'Execution cancelled successfully.', jobId });
  } else {
    res.status(404).json({ error: 'Job not found or already finished.', jobId });
  }
});

router.get('/compile/:jobId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const jobId = req.params.jobId as string;
  const job = await dbGet('SELECT * FROM compilation_jobs WHERE id = ?', [jobId]);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json({
    ...job,
    diagnostics: JSON.parse(job.diagnostics || '[]')
  });
});

// ==========================================
// 4. Special Character Tracker & Precheck
// ==========================================
router.post('/precheck', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code, language } = req.body;
  if (code === undefined || !language) {
    res.status(400).json({ error: 'Code and language are required.' });
    return;
  }

  const report = performCodePrecheck(code, language);
  res.json(report);
});

// ==========================================
// 5. AI Explanation & Root-Cause Analysis
// ==========================================
router.post('/analyze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { code, language, stdout, stderr, exitCode, diagnostics, depth, jobId } = req.body;

  if (!code || !language) {
    res.status(400).json({ error: 'Code and language are required.' });
    return;
  }

  try {
    const analysis = await analyzeCodeError({
      code,
      language,
      stdout,
      stderr,
      exitCode,
      diagnostics,
      depth
    });

    const analysisId = uuidv4();
    const now = new Date().toISOString();

    // Persist analysis in database
    await dbRun(
      `INSERT INTO ai_analyses (
        id, job_id, user_id, language, error_category, error_summary,
        root_cause, line_number, column_number, why_occurred, beginner_explanation,
        proposed_fix, patch_diff, confidence, prevention_tip, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analysisId,
        jobId || 'direct-analysis',
        userId,
        language,
        analysis.errorCategory,
        analysis.errorSummary,
        analysis.rootCause,
        analysis.lineNumber || null,
        analysis.columnNumber || null,
        analysis.whyOccurred,
        analysis.beginnerExplanation,
        analysis.proposedFix,
        analysis.patchDiff,
        analysis.confidence,
        analysis.preventionTip,
        now
      ]
    );

    // Also store Auto-Fix proposal
    const proposalId = uuidv4();
    await dbRun(
      `INSERT INTO auto_fix_proposals (
        id, job_id, user_id, original_code, proposed_code, patch_diff,
        verification_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        proposalId,
        jobId || 'direct-analysis',
        userId,
        code,
        analysis.proposedCode,
        analysis.patchDiff,
        now
      ]
    );

    res.json({
      ...analysis,
      analysisId,
      proposalId
    });
  } catch (err: any) {
    res.status(500).json({ error: `Analysis failed: ${err.message}` });
  }
});

// ==========================================
// 6. Auto-Fix Verification
// ==========================================
router.post('/autofix/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { proposalId } = req.body;

  if (!proposalId) {
    res.status(400).json({ error: 'Proposal ID is required.' });
    return;
  }

  try {
    const verification = await verifyAutoFixProposal(proposalId, userId);
    res.json(verification);
  } catch (err: any) {
    res.status(500).json({ error: `Auto-Fix verification failed: ${err.message}` });
  }
});

// ==========================================
// 7. Smart Study AI Coding Tutor
// ==========================================
router.post('/study/session', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { topic, language, level, userCode, errorSnippet } = req.body;

  if (!topic || !language) {
    res.status(400).json({ error: 'Topic and language are required.' });
    return;
  }

  try {
    const session = await createStudySession(
      userId,
      topic,
      language,
      level || 'beginner',
      userCode,
      errorSnippet
    );
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create study session: ${err.message}` });
  }
});

router.get('/study/session/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const id = req.params.id as string;

  try {
    const session = await getStudySession(id, userId);
    if (!session) {
      res.status(404).json({ error: 'Study session not found.' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/study/quiz/submit', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { quizId, userAnswer } = req.body;

  if (!quizId || userAnswer === undefined) {
    res.status(400).json({ error: 'Quiz ID and user answer are required.' });
    return;
  }

  try {
    const result = await submitQuizAnswer(quizId, userId, userAnswer);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/study/session/:id/stage', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const id = req.params.id as string;
  const { stage } = req.body;

  try {
    await updateSessionStage(id, userId, stage || 1);
    res.json({ message: 'Stage updated successfully.', stage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. Multi-Language Code Translator
// ==========================================
router.post('/translate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { sourceLang, targetLang, sourceCode } = req.body;

  if (!sourceLang || !targetLang || !sourceCode) {
    res.status(400).json({ error: 'Source language, target language, and source code are required.' });
    return;
  }

  try {
    const result = await translateCode(userId, sourceLang, targetLang, sourceCode);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Translation failed: ${err.message}` });
  }
});

// ==========================================
// 9. Code Improvement & Optimization
// ==========================================
router.post('/improve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { language, actionType, code } = req.body;

  if (!language || !actionType || !code) {
    res.status(400).json({ error: 'Language, actionType, and code are required.' });
    return;
  }

  try {
    const result = await improveCode(userId, language, actionType, code);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Improvement failed: ${err.message}` });
  }
});

// ==========================================
// 10. History & Project Management
// ==========================================
router.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const limit = parseInt(req.query.limit as string || '50', 10);
  const lang = req.query.language as string;

  let query = 'SELECT * FROM compilation_jobs WHERE user_id = ?';
  const params: any[] = [userId];

  if (lang) {
    query += ' AND language = ?';
    params.push(lang);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const jobs = await dbAll<any>(query, params);
  res.json({
    jobs: jobs.map(j => ({
      ...j,
      diagnostics: JSON.parse(j.diagnostics || '[]')
    }))
  });
});

router.get('/projects', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const projects = await dbAll('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
  res.json({ projects });
});

router.post('/projects', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const { title, description, language, code, filename } = req.body;

  if (!title || !language) {
    res.status(400).json({ error: 'Title and language are required.' });
    return;
  }

  const projectId = uuidv4();
  const fileId = uuidv4();
  const now = new Date().toISOString();

  await dbRun(
    'INSERT INTO projects (id, user_id, title, description, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [projectId, userId, title, description || '', language, now, now]
  );

  const defaultFilename = filename || (language === 'python' ? 'main.py' : language === 'cpp' ? 'main.cpp' : 'main.c');
  await dbRun(
    'INSERT INTO project_files (id, project_id, filename, content, language, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [fileId, projectId, defaultFilename, code || '', language, now]
  );

  res.json({ projectId, message: 'Project created successfully.' });
});

router.get('/projects/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  const id = req.params.id as string;

  const project = await dbGet('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const files = await dbAll('SELECT * FROM project_files WHERE project_id = ?', [id]);
  res.json({ project, files });
});

// ==========================================
// 11. Analytics Overview
// ==========================================
router.get('/analytics', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 'guest-default-user';
  try {
    const stats = await getUserAnalytics(userId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load analytics: ${err.message}` });
  }
});

export default router;
