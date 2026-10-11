export interface PrecheckFinding {
  type: 'unmatched_bracket' | 'unclosed_string' | 'unclosed_comment' | 'missing_semicolon' | 'missing_include' | 'indentation_warning' | 'syntax_warning';
  category: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  recommendedCorrection: string;
}

export interface PrecheckReport {
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  findings: PrecheckFinding[];
  summaryByCategory: Record<string, number>;
}

interface DelimiterToken {
  char: string;
  line: number;
  col: number;
}

export function performCodePrecheck(code: string, language: string): PrecheckReport {
  const findings: PrecheckFinding[] = [];
  const lang = (language || '').toLowerCase().trim();
  const lines = code.split('\n');

  // Delimiter matching stack
  const stack: DelimiterToken[] = [];
  const matchingPairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  const openingPairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };

  let inBlockComment = false;
  let blockCommentStart = { line: 0, col: 0 };
  let inDoubleQuote = false;
  let doubleQuoteStart = { line: 0, col: 0 };
  let inSingleQuote = false;
  let singleQuoteStart = { line: 0, col: 0 };
  let inTemplateLiteral = false;
  let templateLiteralStart = { line: 0, col: 0 };

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const lineText = lines[lineIdx];
    let isEscaped = false;

    for (let colIdx = 0; colIdx < lineText.length; colIdx++) {
      const colNum = colIdx + 1;
      const char = lineText[colIdx];
      const nextChar = colIdx + 1 < lineText.length ? lineText[colIdx + 1] : '';

      // If inside block comment
      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          colIdx++; // Skip '/'
        }
        continue;
      }

      // If inside double-quoted string
      if (inDoubleQuote) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '"') {
          inDoubleQuote = false;
        }
        continue;
      }

      // If inside single-quoted string
      if (inSingleQuote) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === "'") {
          inSingleQuote = false;
        }
        continue;
      }

      // If inside JS/TS template literal
      if (inTemplateLiteral) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '`') {
          inTemplateLiteral = false;
        }
        continue;
      }

      // Check for start of comments
      if (char === '/' && nextChar === '/') {
        // Single-line comment: rest of the line is ignored
        break;
      }
      if ((lang === 'python' || lang === 'py') && char === '#') {
        // Python single-line comment
        break;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        blockCommentStart = { line: lineNum, col: colNum };
        colIdx++; // Skip '*'
        continue;
      }

      // Check for start of strings
      if (char === '"') {
        inDoubleQuote = true;
        doubleQuoteStart = { line: lineNum, col: colNum };
        continue;
      }
      if (char === "'") {
        inSingleQuote = true;
        singleQuoteStart = { line: lineNum, col: colNum };
        continue;
      }
      if (char === '`' && (lang === 'javascript' || lang === 'js' || lang === 'node')) {
        inTemplateLiteral = true;
        templateLiteralStart = { line: lineNum, col: colNum };
        continue;
      }

      // Bracket tracking
      if (char === '(' || char === '{' || char === '[') {
        stack.push({ char, line: lineNum, col: colNum });
      } else if (char === ')' || char === '}' || char === ']') {
        const expectedOpening = matchingPairs[char];
        if (stack.length === 0) {
          findings.push({
            type: 'unmatched_bracket',
            category: 'Unmatched Closing Delimiter',
            severity: 'error',
            line: lineNum,
            column: colNum,
            message: `Unexpected closing '${char}' with no matching '${expectedOpening}'.`,
            recommendedCorrection: `Remove the stray '${char}' or insert an opening '${expectedOpening}' earlier.`
          });
        } else {
          const top = stack.pop()!;
          if (top.char !== expectedOpening) {
            findings.push({
              type: 'unmatched_bracket',
              category: 'Mismatched Delimiter Pair',
              severity: 'error',
              line: lineNum,
              column: colNum,
              message: `Mismatched closing '${char}'; expected '${openingPairs[top.char]}' to match '${top.char}' opened at line ${top.line}, col ${top.col}.`,
              recommendedCorrection: `Replace '${char}' with '${openingPairs[top.char]}' or balance the enclosing block.`
            });
          }
        }
      }
    }

    // In C, C++, and Java: single-line strings cannot span across lines without escaping
    if (inDoubleQuote && lang !== 'python') {
      findings.push({
        type: 'unclosed_string',
        category: 'Unterminated String',
        severity: 'error',
        line: doubleQuoteStart.line,
        column: doubleQuoteStart.col,
        message: `Unterminated double-quoted string literal starting at line ${doubleQuoteStart.line}, column ${doubleQuoteStart.col}.`,
        recommendedCorrection: `Close the string with a matching '"' before the end of the line.`
      });
      inDoubleQuote = false; // reset for next line
    }
    if (inSingleQuote && lang !== 'python') {
      findings.push({
        type: 'unclosed_string',
        category: 'Unterminated Character/String',
        severity: 'error',
        line: singleQuoteStart.line,
        column: singleQuoteStart.col,
        message: `Unterminated single-quoted literal starting at line ${singleQuoteStart.line}, column ${singleQuoteStart.col}.`,
        recommendedCorrection: `Close the literal with a matching "'" before the end of the line.`
      });
      inSingleQuote = false; // reset for next line
    }

    // Missing Semicolon check for C, C++, Java
    if (lang === 'c' || lang === 'cpp' || lang === 'java') {
      const trimmed = lineText.trim();
      if (
        trimmed &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('#') && // Preprocessor directive
        !trimmed.endsWith(';') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.endsWith(':') && // Case label / access specifier
        !trimmed.endsWith(',') &&
        !trimmed.endsWith('\\') && // Line continuation
        !trimmed.startsWith('if') &&
        !trimmed.startsWith('else') &&
        !trimmed.startsWith('for') &&
        !trimmed.startsWith('while') &&
        !trimmed.startsWith('switch') &&
        !trimmed.startsWith('try') &&
        !trimmed.startsWith('catch') &&
        !trimmed.startsWith('class') &&
        !trimmed.startsWith('struct') &&
        !trimmed.startsWith('enum')
      ) {
        // High likelihood statement missing semicolon (e.g. return 0, int x = 5, cout << "hi", printf("hi"))
        if (
          trimmed.startsWith('return ') ||
          trimmed.startsWith('int ') ||
          trimmed.startsWith('char ') ||
          trimmed.startsWith('double ') ||
          trimmed.startsWith('float ') ||
          trimmed.startsWith('bool ') ||
          trimmed.startsWith('auto ') ||
          trimmed.startsWith('printf(') ||
          trimmed.startsWith('cout') ||
          trimmed.startsWith('cin') ||
          trimmed.startsWith('System.out') ||
          trimmed.includes('=')
        ) {
          findings.push({
            type: 'missing_semicolon',
            category: 'Missing Semicolon',
            severity: 'error',
            line: lineNum,
            column: lineText.length,
            message: `Statement appears to be missing a terminating semicolon ';'.`,
            recommendedCorrection: `Add ';' to the end of line ${lineNum}.`
          });
        }
      }
    }
  }

  // Unclosed block comment at EOF
  if (inBlockComment) {
    findings.push({
      type: 'unclosed_comment',
      category: 'Unterminated Block Comment',
      severity: 'error',
      line: blockCommentStart.line,
      column: blockCommentStart.col,
      message: `Unclosed multi-line comment '/*' opened at line ${blockCommentStart.line}, column ${blockCommentStart.col}.`,
      recommendedCorrection: `Add '*/' to close the comment block.`
    });
  }

  // Remaining open brackets on stack
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    const expectedClosing = openingPairs[unclosed.char];
    findings.push({
      type: 'unmatched_bracket',
      category: 'Unclosed Opening Delimiter',
      severity: 'error',
      line: unclosed.line,
      column: unclosed.col,
      message: `Unclosed '${unclosed.char}' opened at line ${unclosed.line}, col ${unclosed.col}; missing '${expectedClosing}'.`,
      recommendedCorrection: `Add a closing '${expectedClosing}' to balance the opening '${unclosed.char}'.`
    });
  }

  // Missing header preprocessor checks for C/C++
  if (lang === 'c' || lang === 'cpp') {
    const hasStdio = code.includes('<stdio.h>') || code.includes('"stdio.h"');
    const hasIostream = code.includes('<iostream>') || code.includes('"iostream"');
    const hasVector = code.includes('<vector>');
    const hasString = code.includes('<string>') || code.includes('<string.h>');
    const hasStdlib = code.includes('<stdlib.h>') || code.includes('<cstdlib>');

    if ((code.includes('printf') || code.includes('scanf') || code.includes('puts')) && !hasStdio && !hasIostream) {
      findings.push({
        type: 'missing_include',
        category: 'Missing Header Directive',
        severity: 'warning',
        line: 1,
        column: 1,
        message: `Program uses 'printf' or 'scanf' but does not include '<stdio.h>'.`,
        recommendedCorrection: `Add '#include <stdio.h>' at the top of the file.`
      });
    }

    if ((code.includes('cout') || code.includes('cin') || code.includes('endl')) && !hasIostream) {
      findings.push({
        type: 'missing_include',
        category: 'Missing Header Directive',
        severity: 'error',
        line: 1,
        column: 1,
        message: `Program uses C++ stream operations (cout/cin) without including '<iostream>'.`,
        recommendedCorrection: `Add '#include <iostream>' at the top of the file.`
      });
    }

    if (code.includes('vector<') && !hasVector) {
      findings.push({
        type: 'missing_include',
        category: 'Missing Header Directive',
        severity: 'error',
        line: 1,
        column: 1,
        message: `Program uses 'std::vector' but is missing '#include <vector>'.`,
        recommendedCorrection: `Add '#include <vector>' at the top of the file.`
      });
    }

    if ((code.includes('malloc') || code.includes('free') || code.includes('rand()')) && !hasStdlib) {
      findings.push({
        type: 'missing_include',
        category: 'Missing Header Directive',
        severity: 'warning',
        line: 1,
        column: 1,
        message: `Program uses memory management or standard library utilities without '<stdlib.h>' or '<cstdlib>'.`,
        recommendedCorrection: `Add '#include <stdlib.h>' at the top of the file.`
      });
    }
  }

  // Summarize findings
  const summaryByCategory: Record<string, number> = {};
  let errorCount = 0;
  let warningCount = 0;

  for (const f of findings) {
    summaryByCategory[f.category] = (summaryByCategory[f.category] || 0) + 1;
    if (f.severity === 'error') errorCount++;
    else warningCount++;
  }

  return {
    totalFindings: findings.length,
    errorCount,
    warningCount,
    findings,
    summaryByCategory
  };
}
