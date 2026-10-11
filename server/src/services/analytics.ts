import { dbAll, dbGet, dbRun } from '../db/index.js';

export interface AnalyticsOverview {
  totalCompilations: number;
  successfulCompilations: number;
  failedCompilations: number;
  timedOutCompilations: number;
  successRate: number;
  languagesUsed: { language: string; count: number }[];
  recurringMistakes: { errorCategory: string; count: number; language: string; lastOccurred: string }[];
  autoFixStats: {
    totalProposals: number;
    verifiedSuccess: number;
    verifiedFailed: number;
  };
  studyStats: {
    totalSessions: number;
    totalQuizzesTaken: number;
    correctQuizzes: number;
    accuracyRate: number;
  };
}

export async function recordMistake(userId: string, language: string, errorCategory: string, snippet: string): Promise<void> {
  const existing = await dbGet<any>(
    'SELECT * FROM recurring_mistakes WHERE user_id = ? AND language = ? AND error_category = ?',
    [userId, language, errorCategory]
  );

  const now = new Date().toISOString();
  if (existing) {
    await dbRun(
      'UPDATE recurring_mistakes SET occurrence_count = occurrence_count + 1, last_occurred_at = ?, example_code = ? WHERE id = ?',
      [now, snippet.substring(0, 500), existing.id]
    );
  } else {
    const { v4: uuidv4 } = await import('uuid');
    await dbRun(
      `INSERT INTO recurring_mistakes (id, user_id, language, error_category, occurrence_count, last_occurred_at, example_code)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [uuidv4(), userId, language, errorCategory, now, snippet.substring(0, 500)]
    );
  }
}

export async function getUserAnalytics(userId: string): Promise<AnalyticsOverview> {
  // Total compilations
  const totalRow = await dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM compilation_jobs WHERE user_id = ?',
    [userId]
  );
  const totalCompilations = totalRow?.count || 0;

  const successRow = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM compilation_jobs WHERE user_id = ? AND status = 'completed' AND exit_code = 0",
    [userId]
  );
  const successfulCompilations = successRow?.count || 0;

  const failedRow = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM compilation_jobs WHERE user_id = ? AND (status = 'failed' OR exit_code != 0)",
    [userId]
  );
  const failedCompilations = failedRow?.count || 0;

  const timedOutRow = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM compilation_jobs WHERE user_id = ? AND status = 'timed_out'",
    [userId]
  );
  const timedOutCompilations = timedOutRow?.count || 0;

  const successRate = totalCompilations > 0 ? Math.round((successfulCompilations / totalCompilations) * 100) : 0;

  // Language breakdown
  const langRows = await dbAll<{ language: string; count: number }>(
    'SELECT language, COUNT(*) as count FROM compilation_jobs WHERE user_id = ? GROUP BY language ORDER BY count DESC',
    [userId]
  );

  // Recurring mistakes
  const mistakeRows = await dbAll<any>(
    'SELECT error_category as errorCategory, occurrence_count as count, language, last_occurred_at as lastOccurred FROM recurring_mistakes WHERE user_id = ? ORDER BY occurrence_count DESC LIMIT 10',
    [userId]
  );

  // Auto-Fix stats
  const afTotal = await dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM auto_fix_proposals WHERE user_id = ?',
    [userId]
  );
  const afSuccess = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM auto_fix_proposals WHERE user_id = ? AND verification_status = 'verified_success'",
    [userId]
  );
  const afFailed = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM auto_fix_proposals WHERE user_id = ? AND verification_status = 'verified_failed'",
    [userId]
  );

  // Study stats
  const studySessions = await dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM study_sessions WHERE user_id = ?',
    [userId]
  );
  const quizTaken = await dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM study_quizzes WHERE user_id = ? AND user_answer IS NOT NULL',
    [userId]
  );
  const quizCorrect = await dbGet<{ count: number }>(
    'SELECT COUNT(*) as count FROM study_quizzes WHERE user_id = ? AND is_correct = 1',
    [userId]
  );

  const totalQuizzes = quizTaken?.count || 0;
  const correctQuizzes = quizCorrect?.count || 0;
  const accuracyRate = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

  return {
    totalCompilations,
    successfulCompilations,
    failedCompilations,
    timedOutCompilations,
    successRate,
    languagesUsed: langRows || [],
    recurringMistakes: mistakeRows || [],
    autoFixStats: {
      totalProposals: afTotal?.count || 0,
      verifiedSuccess: afSuccess?.count || 0,
      verifiedFailed: afFailed?.count || 0
    },
    studyStats: {
      totalSessions: studySessions?.count || 0,
      totalQuizzesTaken: totalQuizzes,
      correctQuizzes,
      accuracyRate
    }
  };
}
