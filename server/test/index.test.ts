import { runCode } from '../src/services/sandbox.js';
import { performCodePrecheck } from '../src/services/precheck.js';
import { analyzeCodeError } from '../src/services/aiOrchestrator.js';
import { createStudySession, submitQuizAnswer } from '../src/services/study.js';
import { translateCode } from '../src/services/translator.js';
import { improveCode } from '../src/services/improvement.js';
import { getUserAnalytics } from '../src/services/analytics.js';
import { initDatabase, dbRun } from '../src/db/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, extra?: any) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m ${testName}`, extra || '');
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n========================================================');
  console.log('   STARTING SMART COMPILER AUTOMATED BACKEND TESTS');
  console.log('========================================================\n');

  // Initialize DB
  await initDatabase();

  // Test 1: C Execution
  console.log('[1/12] Testing C Native Compilation & Execution...');
  const cRes = await runCode({
    language: 'c',
    code: '#include <stdio.h>\nint main() {\n    printf("Hello from C Engine!\\n");\n    return 0;\n}'
  });
  assert(cRes.status === 'completed' && cRes.exitCode === 0 && cRes.stdout.includes('Hello from C Engine!'), 'C program compiles and outputs correctly');

  // Test 2: C++ Execution
  console.log('[2/12] Testing C++ Native Compilation & Execution...');
  const cppRes = await runCode({
    language: 'cpp',
    code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello C++ " << (20 + 6) << endl;\n    return 0;\n}'
  });
  assert(cppRes.status === 'completed' && cppRes.exitCode === 0 && cppRes.stdout.includes('Hello C++ 26'), 'C++ program compiles and calculates correctly');

  // Test 3: Python Execution
  console.log('[3/12] Testing Python Native Execution...');
  const pyRes = await runCode({
    language: 'python',
    code: 'x = [1, 2, 3]\nprint("Sum:", sum(x))'
  });
  assert(pyRes.status === 'completed' && pyRes.exitCode === 0 && pyRes.stdout.includes('Sum: 6'), 'Python program runs and returns valid stdout');

  // Test 4: JavaScript Execution
  console.log('[4/12] Testing JavaScript / Node Execution...');
  const jsRes = await runCode({
    language: 'javascript',
    code: 'const msg = "JS Engine Active"; console.log(msg);'
  });
  assert(jsRes.status === 'completed' && jsRes.exitCode === 0 && jsRes.stdout.includes('JS Engine Active'), 'Node.js program executes correctly');

  // Test 5: Interactive Stdin Handling
  console.log('[5/12] Testing Standard Input (stdin)...');
  const stdinRes = await runCode({
    language: 'python',
    code: 'import sys\nname = sys.stdin.read().strip()\nprint(f"Hello, {name}!")',
    stdin: 'SmartCoder'
  });
  assert(stdinRes.stdout.includes('Hello, SmartCoder!'), 'Standard input is piped successfully to process');

  // Test 6: Timeout Watchdog and Infinite Loop Protection
  console.log('[6/12] Testing Sandbox Timeout & Infinite Loop Termination...');
  const timeoutStart = Date.now();
  const loopRes = await runCode({
    language: 'python',
    code: 'import time\nwhile True:\n    pass',
    timeoutMs: 2000
  });
  const elapsed = Date.now() - timeoutStart;
  assert(loopRes.status === 'timed_out', 'Infinite loop caught and timed out safely');
  assert(elapsed >= 1900 && elapsed < 4000, `Execution terminated within bounded timeout (${elapsed}ms)`);

  // Test 7: Deterministic Special Character Tracker & Precheck
  console.log('[7/12] Testing Deterministic Code Precheck & Bracket Tracker...');
  const brokenCode = `int main() {
    int x = (10 + 20;
    cout << "Unclosed string
    return 0
}`;
  const precheck = performCodePrecheck(brokenCode, 'cpp');
  assert(precheck.totalFindings > 0, 'Precheck flags syntax flaws before compilation');
  assert(precheck.findings.some(f => f.type === 'unmatched_bracket'), 'Detects unmatched parenthesis');
  assert(precheck.findings.some(f => f.type === 'unclosed_string'), 'Detects unclosed string literal');
  assert(precheck.findings.some(f => f.type === 'missing_semicolon'), 'Detects missing semicolon on return statement');

  // Test 8: Real Compiler Diagnostics & Error Mapping
  console.log('[8/12] Testing Real Compiler Diagnostics Capture...');
  const errCode = `#include <iostream>
using namespace std;
int main() {
    cout << "Missing semicolon" << endl
    return 0;
}`;
  const errRes = await runCode({ language: 'cpp', code: errCode });
  assert(errRes.status === 'failed' && errRes.exitCode !== 0, 'Compiler rejects invalid code with non-zero exit code');
  assert(errRes.diagnostics.length > 0, 'Captures structured diagnostics from compiler stderr');

  // Test 9: AI Root-Cause Analysis & Unified Diff Generation
  console.log('[9/12] Testing AI Root-Cause Analysis...');
  const aiAnalysis = await analyzeCodeError({
    code: errCode,
    language: 'cpp',
    stderr: errRes.stderr,
    exitCode: errRes.exitCode,
    diagnostics: errRes.diagnostics
  });
  assert(aiAnalysis.errorCategory.includes('Semicolon'), 'Categorizes missing semicolon correctly');
  assert(aiAnalysis.proposedFix.length > 0, 'Generates actionable fix recommendation');
  assert(aiAnalysis.patchDiff.includes('+'), 'Generates valid unified diff patch');

  // Test 10: Multi-Language Code Translation
  console.log('[10/12] Testing Code Translator & Target Validation...');
  const transRes = await translateCode(
    'test-user-1',
    'c',
    'python',
    '#include <stdio.h>\nint main() {\n    printf("Translated message\\n");\n    return 0;\n}'
  );
  assert(transRes.translatedCode.includes('print('), 'Converts C printf to Python print');
  assert(transRes.validationStatus === 'valid', 'Translated Python code verified and executes successfully');

  // Test 11: Smart Study Tutor Curriculum & Quiz
  console.log('[11/12] Testing Smart Study 4-Stage Session & Quiz...');
  const studySession = await createStudySession(
    'test-user-1',
    'Binary Search',
    'cpp',
    'beginner'
  );
  assert(studySession.curriculum.stage1_concept.terminology.length > 0, 'Stage 1 concepts generated');
  assert(studySession.curriculum.stage3_practice.quizzes.length >= 2, 'Stage 3 practice quizzes generated');

  // Test 12: Analytics Aggregation
  console.log('[12/12] Testing User Analytics & Progress Tracking...');
  const analytics = await getUserAnalytics('test-user-1');
  assert(analytics.languagesUsed !== undefined, 'Analytics retrieves language breakdown');

  console.log('\n========================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
