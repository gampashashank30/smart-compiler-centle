import { runCode, ExecutionResult } from './sandbox.js';
import { dbRun, dbGet } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface VerifyFixResult {
  proposalId: string;
  isResolved: boolean;
  verificationStatus: 'verified_success' | 'verified_failed';
  verificationJobId: string;
  executionResult: ExecutionResult;
  message: string;
}

export async function verifyAutoFixProposal(
  proposalId: string,
  userId: string
): Promise<VerifyFixResult> {
  const proposal = await dbGet<any>(
    'SELECT * FROM auto_fix_proposals WHERE id = ? AND user_id = ?',
    [proposalId, userId]
  );

  if (!proposal) {
    throw new Error('Auto-Fix proposal not found or unauthorized.');
  }

  // Get original job to know the language and stdin
  const originalJob = await dbGet<any>(
    'SELECT * FROM compilation_jobs WHERE id = ?',
    [proposal.job_id]
  );

  const language = originalJob?.language || 'c';
  const stdin = originalJob?.stdin || '';

  // Run the proposed code through the genuine sandbox
  const verifyJobId = uuidv4();
  const execResult = await runCode(
    {
      language,
      code: proposal.proposed_code,
      stdin
    },
    verifyJobId
  );

  // Persist verification compilation job
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO compilation_jobs (
      id, user_id, project_id, language, code, stdin, status, exit_code,
      stdout, stderr, compile_time_ms, exec_time_ms, diagnostics, created_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      verifyJobId,
      userId,
      originalJob?.project_id || null,
      language,
      proposal.proposed_code,
      stdin,
      execResult.status,
      execResult.exitCode,
      execResult.stdout,
      execResult.stderr,
      execResult.compileTimeMs,
      execResult.execTimeMs,
      JSON.stringify(execResult.diagnostics),
      now,
      now
    ]
  );

  const isResolved = execResult.status === 'completed' && execResult.exitCode === 0;
  const verificationStatus = isResolved ? 'verified_success' : 'verified_failed';

  // Update proposal record
  await dbRun(
    'UPDATE auto_fix_proposals SET verification_status = ?, verification_job_id = ? WHERE id = ?',
    [verificationStatus, verifyJobId, proposalId]
  );

  return {
    proposalId,
    isResolved,
    verificationStatus,
    verificationJobId: verifyJobId,
    executionResult: execResult,
    message: isResolved
      ? 'Fix verified successfully! The updated code compiles and executes with exit code 0.'
      : 'Verification failed. The proposed fix did not completely resolve all diagnostics.'
  };
}
