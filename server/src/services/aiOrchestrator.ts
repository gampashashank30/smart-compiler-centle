import { CONFIG } from '../config.js';
import { Diagnostic } from './sandbox.js';

export interface AIExplanationResult {
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

export interface AIAnalysisRequest {
  code: string;
  language: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  diagnostics?: Diagnostic[];
  depth?: 'beginner' | 'intermediate' | 'advanced';
}

export async function analyzeCodeError(req: AIAnalysisRequest): Promise<AIExplanationResult> {
  const code = req.code || '';
  const language = (req.language || 'c').toLowerCase();
  const stderr = req.stderr || '';
  const stdout = req.stdout || '';
  const diagnostics = req.diagnostics || [];
  const depth = req.depth || 'beginner';

  // If external provider is configured and not heuristic, try external AI first
  if (CONFIG.AI.API_KEY && CONFIG.AI.PROVIDER !== 'heuristic') {
    try {
      const externalResult = await callExternalAIProvider(req);
      if (externalResult) {
        return externalResult;
      }
    } catch (err: any) {
      console.warn(`[AI Orchestrator] External provider '${CONFIG.AI.PROVIDER}' failed: ${err.message}. Falling back to deterministic analysis.`);
    }
  }

  // Deterministic Expert Diagnostic & Root-Cause Engine
  return runDeterministicAnalysis(code, language, stderr, stdout, diagnostics, depth);
}

function runDeterministicAnalysis(
  code: string,
  language: string,
  stderr: string,
  stdout: string,
  diagnostics: Diagnostic[],
  depth: 'beginner' | 'intermediate' | 'advanced'
): AIExplanationResult {
  const combinedErr = `${stderr}\n${diagnostics.map(d => d.message).join('\n')}`.trim();
  const lines = code.split('\n');

  let errorCategory = 'General Compilation Error';
  let errorSummary = 'Compilation or runtime issue detected.';
  let rootCause = 'The program did not exit cleanly or encountered an error.';
  let lineNumber: number | undefined = diagnostics[0]?.line;
  let columnNumber: number | undefined = diagnostics[0]?.column;
  let whyOccurred = 'The compiler or runtime encountered invalid syntax or state.';
  let beginnerExplanation = 'There is an issue preventing your code from executing successfully.';
  let proposedFix = 'Review the compiler error message and inspect the highlighted line.';
  let proposedCode = code;
  let preventionTip = 'Always compile frequently after making small changes.';
  let confidence = 0.85;

  // 1. Missing Semicolon in C/C++/Java
  if (/expected ';'/i.test(combinedErr) || /missing ';'/i.test(combinedErr)) {
    errorCategory = 'Syntax Error: Missing Semicolon';
    errorSummary = "A required statement terminating semicolon ';' is missing.";
    const match = combinedErr.match(/(\d+):(\d+):.*expected ';'/i);
    if (match) {
      lineNumber = parseInt(match[1], 10);
      columnNumber = parseInt(match[2], 10);
    }
    rootCause = `The compiler reached an expression or statement boundary that requires a semicolon to mark the end of the instruction.`;
    whyOccurred = `In ${language.toUpperCase()}, every expression statement (like variable declaration, assignment, or function call) must end with a semicolon ';' so the parser knows where the instruction ends.`;
    beginnerExplanation = `Think of a semicolon like a period at the end of a sentence. Without it, the computer thinks two separate instructions are crammed together into one!`;
    preventionTip = `Check the end of every line before closing braces '{ }' and after return statements.`;
    confidence = 0.96;

    if (lineNumber && lineNumber <= lines.length) {
      const targetIdx = lineNumber - 1;
      // In many compilers, error line is on the token after the missing semicolon (e.g. line with '}')
      let editLine = targetIdx;
      if (lines[editLine].trim() === '}' && editLine > 0) {
        editLine = editLine - 1;
      }
      const fixedLines = [...lines];
      if (!fixedLines[editLine].trim().endsWith(';')) {
        fixedLines[editLine] = `${fixedLines[editLine].trimEnd()};`;
        proposedCode = fixedLines.join('\n');
        proposedFix = `Add a semicolon ';' to the end of line ${editLine + 1}.`;
      }
    }
  }

  // 2. Undefined Variable / Identifier
  else if (/was not declared in this scope|undefined identifier|NameError: name '([^']+)' is not defined|ReferenceError: (\w+) is not defined/i.test(combinedErr)) {
    errorCategory = 'Name Resolution: Undefined Identifier';
    const varNameMatch = combinedErr.match(/'([^']+)'/);
    const varName = varNameMatch ? varNameMatch[1] : 'variable';
    errorSummary = `Identifier '${varName}' is used before being declared or defined.`;
    rootCause = `The compiler/runtime searched the current scope and parent scopes for '${varName}' but could not find any matching declaration.`;
    whyOccurred = `Variables and functions must be declared or imported before they can be evaluated.`;
    beginnerExplanation = `The computer was asked to use '${varName}', but nobody introduced '${varName}' yet! Make sure you didn't misspell it or forget to create it.`;
    preventionTip = `Double check your spelling, capitalization, and verify whether the variable was declared inside an inner block.`;
    confidence = 0.92;
  }

  // 3. Missing Header / Include in C/C++
  else if (/cout.*was not declared|cin.*was not declared|printf.*implicitly declared|vector.*does not name a type/i.test(combinedErr)) {
    errorCategory = 'Header / Preprocessor Directive Missing';
    errorSummary = `Standard library utility is used without its corresponding header file.`;
    if (combinedErr.includes('cout') || combinedErr.includes('cin')) {
      rootCause = `Standard input/output streams ('cout' / 'cin') require '#include <iostream>' and the 'std::' namespace.`;
      whyOccurred = `C++ does not automatically import IO streams; you must explicitly include <iostream>.`;
      beginnerExplanation = `You need to tell C++ where to find 'cout' by including the '<iostream>' library at the very top of your file.`;
      preventionTip = `Always start your C++ files with '#include <iostream>' and 'using namespace std;'.`;
      if (!code.includes('<iostream>')) {
        proposedCode = `#include <iostream>\nusing namespace std;\n\n${code.replace(/^using namespace std;\s*/m, '')}`;
        proposedFix = `Add '#include <iostream>' and 'using namespace std;' at the beginning of the source code.`;
      }
    } else if (combinedErr.includes('printf')) {
      rootCause = `'printf' requires the standard input/output library in C.`;
      whyOccurred = `The C compiler cannot find the declaration for printf without <stdio.h>.`;
      beginnerExplanation = `Include the standard input/output header file at the top of your program.`;
      preventionTip = `Include '#include <stdio.h>' at the top of all C programs.`;
      if (!code.includes('<stdio.h>')) {
        proposedCode = `#include <stdio.h>\n\n${code}`;
        proposedFix = `Add '#include <stdio.h>' to the top of the file.`;
      }
    }
    confidence = 0.95;
  }

  // 4. Division by Zero
  else if (/division by zero|ZeroDivisionError/i.test(combinedErr)) {
    errorCategory = 'Runtime Error: Division by Zero';
    errorSummary = 'Attempted to divide a number by zero during execution.';
    rootCause = 'A division or modulo operator had a denominator value evaluating to 0.';
    whyOccurred = 'Division by zero is mathematically undefined and triggers a fatal CPU arithmetic fault or runtime exception.';
    beginnerExplanation = 'You cannot divide any number by zero! Check your denominator variable before doing division.';
    preventionTip = 'Add an if-condition: `if (denominator != 0) { ... } else { /* handle error */ }` before dividing.';
    confidence = 0.98;
  }

  // 5. Index Out of Range / Bounds
  else if (/IndexError|ArrayIndexOutOfBoundsException|out of range|Segmentation fault/i.test(combinedErr)) {
    errorCategory = 'Memory / Bounds: Index Out of Range';
    errorSummary = 'Accessed an array or collection index outside its valid boundaries.';
    rootCause = 'Index value was greater than or equal to the collection length, or negative.';
    whyOccurred = 'Arrays are zero-indexed: valid indices for an array of size N are 0 through N-1.';
    beginnerExplanation = 'If an array has 5 items, their slots are 0, 1, 2, 3, and 4. Asking for slot 5 will crash the program!';
    preventionTip = 'Ensure loop counters use `< array.length` rather than `<= array.length`.';
    confidence = 0.90;
  }

  // 6. Execution Timeout / Infinite Loop
  else if (/timed out/i.test(combinedErr) || /infinite loop/i.test(combinedErr)) {
    errorCategory = 'Runtime: Execution Timeout';
    errorSummary = 'The program ran longer than the permitted limit (possible infinite loop).';
    rootCause = 'A while loop, for loop, or recursion failed to reach a terminating base case.';
    whyOccurred = 'When loop conditions remain true indefinitely or variables are not modified toward the exit condition, the program hangs.';
    beginnerExplanation = 'Your code is running in a never-ending circle! Check the counters in your while or for loops.';
    preventionTip = 'Verify that loop variables are updated inside every branch of the loop body.';
    confidence = 0.94;
  }

  // 7. General Python Indentation Error
  else if (/IndentationError/i.test(combinedErr)) {
    errorCategory = 'Syntax Error: Indentation Mismatch';
    errorSummary = 'Inconsistent indentation or unexpected indentation block.';
    rootCause = 'Python relies on exact whitespace indentation to delimit code blocks.';
    whyOccurred = 'Mixing tabs and spaces or failing to indent after a colon `:` causes an IndentationError.';
    beginnerExplanation = 'Python uses spaces to know which lines belong inside an if-statement or loop. Make sure your lines line up neatly!';
    preventionTip = 'Use 4 spaces for every level of indentation and avoid mixing tabs with spaces.';
    confidence = 0.95;
  }

  // Build unified diff
  const patchDiff = generateUnifiedDiff(code, proposedCode);

  return {
    errorCategory,
    errorSummary,
    rootCause,
    lineNumber,
    columnNumber,
    whyOccurred,
    beginnerExplanation,
    proposedFix,
    proposedCode,
    patchDiff,
    preventionTip,
    confidence,
    providerUsed: 'Smart Deterministic Static & Diagnostic Engine'
  };
}

function generateUnifiedDiff(original: string, proposed: string): string {
  if (original === proposed) return '';
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  const diffChunks: string[] = ['--- original', '+++ proposed'];

  const maxLen = Math.max(origLines.length, propLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i];
    const p = propLines[i];
    if (o !== p) {
      if (o !== undefined) diffChunks.push(`- ${o}`);
      if (p !== undefined) diffChunks.push(`+ ${p}`);
    } else {
      diffChunks.push(`  ${o}`);
    }
  }

  return diffChunks.join('\n');
}

async function callExternalAIProvider(req: AIAnalysisRequest): Promise<AIExplanationResult | null> {
  const provider = CONFIG.AI.PROVIDER;
  const apiKey = CONFIG.AI.API_KEY;

  let endpoint = '';
  let authHeader = `Bearer ${apiKey}`;
  let model = CONFIG.AI.MODEL;

  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    if (!model) model = 'llama-3.3-70b-versatile';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    if (!model) model = 'meta-llama/llama-3.3-70b-instruct';
  } else if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    if (!model) model = 'gpt-4o-mini';
  } else if (provider === 'ollama') {
    endpoint = CONFIG.AI.ENDPOINT || 'http://localhost:11434/v1/chat/completions';
    authHeader = 'Bearer ollama';
    if (!model) model = 'llama3.2';
  } else {
    return null;
  }

  const systemPrompt = `You are the Smart Compiler AI Diagnostic Engine.
Analyze the provided code and execution/compiler output.
You MUST output ONLY a valid JSON object matching this exact schema:
{
  "errorCategory": "string",
  "errorSummary": "string",
  "rootCause": "string",
  "lineNumber": number or null,
  "columnNumber": number or null,
  "whyOccurred": "string",
  "beginnerExplanation": "string",
  "proposedFix": "string",
  "proposedCode": "string (the complete fixed source code)",
  "preventionTip": "string",
  "confidence": number between 0.5 and 0.99
}`;

  const userPrompt = `Language: ${req.language}
Target Audience: ${req.depth || 'beginner'} student

Source Code:
\`\`\`${req.language}
${req.code}
\`\`\`

Standard Output:
${req.stdout || '(none)'}

Standard Error / Compiler Diagnostics:
${req.stderr || '(none)'}
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API HTTP ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    const parsed = JSON.parse(content);
    const patchDiff = generateUnifiedDiff(req.code, parsed.proposedCode || req.code);

    return {
      errorCategory: parsed.errorCategory || 'Compilation Error',
      errorSummary: parsed.errorSummary || 'Issue detected in code.',
      rootCause: parsed.rootCause || 'Root cause identified.',
      lineNumber: parsed.lineNumber || undefined,
      columnNumber: parsed.columnNumber || undefined,
      whyOccurred: parsed.whyOccurred || '',
      beginnerExplanation: parsed.beginnerExplanation || '',
      proposedFix: parsed.proposedFix || '',
      proposedCode: parsed.proposedCode || req.code,
      patchDiff,
      preventionTip: parsed.preventionTip || 'Review your code carefully.',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      providerUsed: `${provider.toUpperCase()} (${model})`
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
