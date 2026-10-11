import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';

export interface ExecutionOptions {
  language: string;
  code: string;
  stdin?: string;
  timeoutMs?: number;
}

export interface ExecutionResult {
  jobId: string;
  status: 'completed' | 'failed' | 'timed_out' | 'cancelled';
  exitCode: number | null;
  stdout: string;
  stderr: string;
  compileTimeMs: number;
  execTimeMs: number;
  diagnostics: Diagnostic[];
}

export interface Diagnostic {
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  raw: string;
}

// Global active processes for cancellation
const activeJobs = new Map<string, { process: ChildProcess; jobDir: string; cancelled: boolean }>();

export function cancelJob(jobId: string): boolean {
  const active = activeJobs.get(jobId);
  if (!active) return false;
  active.cancelled = true;
  killProcessTree(active.process);
  return true;
}

function killProcessTree(child: ChildProcess): void {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch (err) {
    // Process might already be dead
  }
}

function parseDiagnostics(output: string, language: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // GCC / Clang format: main.cpp:5:10: error: expected ';' before '}' token
    const gccMatch = trimmed.match(/^([^:]+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/i);
    if (gccMatch) {
      diagnostics.push({
        line: parseInt(gccMatch[2], 10),
        column: parseInt(gccMatch[3], 10),
        severity: gccMatch[4].toLowerCase() === 'warning' ? 'warning' : 'error',
        message: gccMatch[5],
        raw: trimmed
      });
      continue;
    }

    // Python traceback format: File "main.py", line 4, in <module>
    const pyMatch = trimmed.match(/File "([^"]+)", line (\d+)(?:, in (.+))?/i);
    if (pyMatch) {
      diagnostics.push({
        line: parseInt(pyMatch[2], 10),
        severity: 'error',
        message: pyMatch[3] ? `At ${pyMatch[3]}` : 'Python error',
        raw: trimmed
      });
      continue;
    }

    // Python error line (e.g. NameError: name 'x' is not defined)
    const pyErrType = trimmed.match(/^([A-Za-z]+Error|Exception):\s*(.+)$/);
    if (pyErrType) {
      diagnostics.push({
        severity: 'error',
        message: `${pyErrType[1]}: ${pyErrType[2]}`,
        raw: trimmed
      });
      continue;
    }

    // Node / JS format: SyntaxError: Unexpected token or ReferenceError: ...
    const jsErr = trimmed.match(/^([A-Za-z]+Error):\s*(.+)$/);
    if (jsErr) {
      diagnostics.push({
        severity: 'error',
        message: `${jsErr[1]}: ${jsErr[2]}`,
        raw: trimmed
      });
      continue;
    }
  }

  return diagnostics;
}

export async function runCode(options: ExecutionOptions, customJobId?: string): Promise<ExecutionResult> {
  const jobId = customJobId || uuidv4();
  const lang = options.language.toLowerCase().trim();
  const timeoutMs = Math.min(Math.max(options.timeoutMs || CONFIG.MAX_EXEC_TIME_MS, 1000), 15000);

  // Validate code length
  if (!options.code || options.code.length > CONFIG.MAX_SOURCE_LENGTH) {
    return {
      jobId,
      status: 'failed',
      exitCode: 1,
      stdout: '',
      stderr: 'Source code is empty or exceeds the maximum permitted size (100KB).',
      compileTimeMs: 0,
      execTimeMs: 0,
      diagnostics: []
    };
  }

  // Create isolated temp workspace
  const tempBase = path.join(os.tmpdir(), 'smart_compiler_jobs');
  const jobDir = path.join(tempBase, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const sanitizedEnv = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    TEMP: jobDir,
    TMP: jobDir
  };

  try {
    let compileTimeMs = 0;
    let execTimeMs = 0;

    if (lang === 'c' || lang === 'cpp') {
      const isCpp = lang === 'cpp';
      const srcFileName = isCpp ? 'main.cpp' : 'main.c';
      const exeName = process.platform === 'win32' ? 'main.exe' : './main';
      const srcPath = path.join(jobDir, srcFileName);
      const exePath = path.join(jobDir, process.platform === 'win32' ? 'main.exe' : 'main');

      await fs.writeFile(srcPath, options.code, 'utf-8');

      // 1. Compile Step
      const compiler = isCpp ? 'g++' : 'gcc';
      const compileArgs = isCpp
        ? ['-std=c++17', '-Wall', '-O2', srcFileName, '-o', exeName]
        : ['-Wall', '-O2', srcFileName, '-o', exeName];

      const compileStart = Date.now();
      const compileRes = await spawnProcessWithTimeout(compiler, compileArgs, jobDir, 10000, '', sanitizedEnv, jobId);
      compileTimeMs = Date.now() - compileStart;

      if (compileRes.status === 'cancelled') {
        return {
          jobId,
          status: 'cancelled',
          exitCode: null,
          stdout: compileRes.stdout,
          stderr: 'Compilation cancelled by user.',
          compileTimeMs,
          execTimeMs: 0,
          diagnostics: []
        };
      }

      if (compileRes.exitCode !== 0) {
        return {
          jobId,
          status: 'failed',
          exitCode: compileRes.exitCode,
          stdout: compileRes.stdout,
          stderr: compileRes.stderr,
          compileTimeMs,
          execTimeMs: 0,
          diagnostics: parseDiagnostics(compileRes.stderr, lang)
        };
      }

      // 2. Execute Step
      const execStart = Date.now();
      const execRes = await spawnProcessWithTimeout(exePath, [], jobDir, timeoutMs, options.stdin || '', sanitizedEnv, jobId);
      execTimeMs = Date.now() - execStart;

      return {
        jobId,
        status: execRes.status,
        exitCode: execRes.exitCode,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        compileTimeMs,
        execTimeMs,
        diagnostics: parseDiagnostics(execRes.stderr, lang)
      };

    } else if (lang === 'python' || lang === 'py') {
      const srcPath = path.join(jobDir, 'main.py');
      await fs.writeFile(srcPath, options.code, 'utf-8');

      const execStart = Date.now();
      const execRes = await spawnProcessWithTimeout('python', ['-u', 'main.py'], jobDir, timeoutMs, options.stdin || '', sanitizedEnv, jobId);
      execTimeMs = Date.now() - execStart;

      return {
        jobId,
        status: execRes.status,
        exitCode: execRes.exitCode,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        compileTimeMs: 0,
        execTimeMs,
        diagnostics: parseDiagnostics(execRes.stderr, 'python')
      };

    } else if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      const srcPath = path.join(jobDir, 'main.js');
      await fs.writeFile(srcPath, options.code, 'utf-8');

      const execStart = Date.now();
      const execRes = await spawnProcessWithTimeout('node', ['main.js'], jobDir, timeoutMs, options.stdin || '', sanitizedEnv, jobId);
      execTimeMs = Date.now() - execStart;

      return {
        jobId,
        status: execRes.status,
        exitCode: execRes.exitCode,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        compileTimeMs: 0,
        execTimeMs,
        diagnostics: parseDiagnostics(execRes.stderr, 'javascript')
      };

    } else if (lang === 'java') {
      // Check if javac is installed
      const srcPath = path.join(jobDir, 'Main.java');
      await fs.writeFile(srcPath, options.code, 'utf-8');

      try {
        const compileStart = Date.now();
        const compileRes = await spawnProcessWithTimeout('javac', ['Main.java'], jobDir, 10000, '', sanitizedEnv, jobId);
        compileTimeMs = Date.now() - compileStart;

        if (compileRes.exitCode !== 0) {
          return {
            jobId,
            status: 'failed',
            exitCode: compileRes.exitCode,
            stdout: compileRes.stdout,
            stderr: compileRes.stderr,
            compileTimeMs,
            execTimeMs: 0,
            diagnostics: parseDiagnostics(compileRes.stderr, 'java')
          };
        }

        const execStart = Date.now();
        const execRes = await spawnProcessWithTimeout('java', ['Main'], jobDir, timeoutMs, options.stdin || '', sanitizedEnv, jobId);
        execTimeMs = Date.now() - execStart;

        return {
          jobId,
          status: execRes.status,
          exitCode: execRes.exitCode,
          stdout: execRes.stdout,
          stderr: execRes.stderr,
          compileTimeMs,
          execTimeMs,
          diagnostics: parseDiagnostics(execRes.stderr, 'java')
        };
      } catch (err: any) {
        return {
          jobId,
          status: 'failed',
          exitCode: 127,
          stdout: '',
          stderr: `Java runtime environment (JDK/javac) is not configured or detected on this host system.\nTo compile Java, install OpenJDK (version 17+) and verify that 'javac' is available in PATH.`,
          compileTimeMs: 0,
          execTimeMs: 0,
          diagnostics: [{
            severity: 'error',
            message: 'Java compiler (javac) not found in system PATH.',
            raw: 'Environment check: javac is not available.'
          }]
        };
      }

    } else {
      return {
        jobId,
        status: 'failed',
        exitCode: 1,
        stdout: '',
        stderr: `Unsupported language: '${options.language}'. Supported languages are: c, cpp, python, javascript, java.`,
        compileTimeMs: 0,
        execTimeMs: 0,
        diagnostics: []
      };
    }

  } finally {
    activeJobs.delete(jobId);
    // Cleanup temporary job files
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore file unlock delays on Windows temp cleanup
    }
  }
}

interface ProcessResult {
  status: 'completed' | 'failed' | 'timed_out' | 'cancelled';
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function spawnProcessWithTimeout(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  stdinData: string,
  env: NodeJS.ProcessEnv,
  jobId: string
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let isFinished = false;

    let child: ChildProcess;
    try {
      child = spawn(cmd, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });
    } catch (err: any) {
      return resolve({
        status: 'failed',
        exitCode: 127,
        stdout: '',
        stderr: `Failed to spawn process '${cmd}': ${err.message}`
      });
    }

    activeJobs.set(jobId, { process: child, jobDir: cwd, cancelled: false });

    // Wall-clock watchdog timer
    const timer = setTimeout(() => {
      if (!isFinished) {
        timedOut = true;
        killProcessTree(child);
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      if (stdout.length < CONFIG.MAX_OUTPUT_BYTES) {
        stdout += chunk.toString();
        if (stdout.length >= CONFIG.MAX_OUTPUT_BYTES) {
          stdout += '\n[Output truncated: Exceeded maximum permitted 64KB buffer]';
        }
      }
    });

    child.stderr?.on('data', (chunk) => {
      if (stderr.length < CONFIG.MAX_OUTPUT_BYTES) {
        stderr += chunk.toString();
        if (stderr.length >= CONFIG.MAX_OUTPUT_BYTES) {
          stderr += '\n[Error output truncated: Exceeded maximum permitted 64KB buffer]';
        }
      }
    });

    // Provide stdin if any
    if (stdinData && child.stdin) {
      child.stdin.write(stdinData);
      child.stdin.end();
    } else if (child.stdin) {
      child.stdin.end();
    }

    child.on('error', (err) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);
      resolve({
        status: 'failed',
        exitCode: 1,
        stdout,
        stderr: `${stderr}\nExecution error: ${err.message}`.trim()
      });
    });

    child.on('close', (code) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);

      const active = activeJobs.get(jobId);
      if (active?.cancelled) {
        return resolve({
          status: 'cancelled',
          exitCode: null,
          stdout,
          stderr: 'Execution cancelled by user.'
        });
      }

      if (timedOut) {
        return resolve({
          status: 'timed_out',
          exitCode: null,
          stdout,
          stderr: `Execution timed out after ${timeoutMs}ms. Possible infinite loop or slow program.`
        });
      }

      resolve({
        status: code === 0 ? 'completed' : 'failed',
        exitCode: code,
        stdout,
        stderr
      });
    });
  });
}
