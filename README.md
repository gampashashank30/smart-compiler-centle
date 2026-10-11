# Smart Compiler — The Complete AI-Powered Coding Platform

> **A smarter way to write, run, understand and improve code.**  
> *Code. Understand. Fix. Learn.*

Smart Compiler is a production-ready, AI-powered coding and learning platform developed to help students and developers write, execute, debug, understand, translate, optimize, learn, and track their programming progress in one place.

---

## Key Modules & Capabilities

1. **Code Playground & Compiler**:
   - High-contrast Monaco Editor with line numbers, code folding, bracket colorization, word wrap, and minimap toggle.
   - Native execution for **C** (GCC/Clang), **C++** (Clang++/G++ 17), **Python** (3.12), **JavaScript** (Node.js), and Java detection.
   - Isolated ephemeral sandbox directories (`temp/jobs/<uuid>`), 5-second execution watchdog, 64KB stdout/stderr clamps, process-tree termination, and real-time cancellation.
   - Interactive standard input (`stdin`) terminal drawer.
2. **Deterministic Code Precheck & Special Character Tracker**:
   - Lexer state machine tracking parentheses `()`, curly braces `{}`, and square brackets `[]` with exact line and column numbers.
   - Unterminated string detection (`"..."`, `'...'`, `` `...` ``) and unclosed block comments (`/* ... */`).
   - Missing semicolon detection for C/C++/Java statements outside comments and strings.
   - Missing header directive precheck (`#include <stdio.h>`, `<iostream>`, `<vector>`, `<stdlib.h>`).
3. **AI Root-Cause Diagnostics & Explanation**:
   - Categorizes compiler errors: SyntaxError, UndefinedIdentifier, MissingInclude, DivisionByZero, IndexOutOfBounds, ExecutionTimeout, etc.
   - Maps compiler diagnostics to line and column numbers.
   - Explains technical root cause, beginner-friendly analogies, and recurring mistake prevention tips.
   - Pluggable provider architecture: Groq, OpenRouter, Google Gemini, Ollama, OpenAI, and a built-in deterministic heuristic engine.
4. **Smart Auto-Fix & Recompilation Verification**:
   - Generates minimal unified diff patches.
   - **Recompiles the patch in the live sandbox** to verify that exit code 0 is achieved before confirming resolution.
   - Single-click apply to the active Monaco Editor.
5. **Smart Study — AI Coding Tutor**:
   - 4-Stage structured curriculum:
     - **Stage 1**: Concept overview, prerequisites, and key terminology.
     - **Stage 2**: Step-by-step guided breakdown and boundary conditions.
     - **Stage 3**: Interactive practice quizzes with hints, instant feedback, and explanations.
     - **Stage 4**: Applied coding challenge with sandbox runner and reference solution.
6. **Multi-Language Code Translator**:
   - Translates code between C, C++, Python, JavaScript, and Java.
   - Explains language differences: static vs. dynamic typing, memory models, integer division, and standard I/O.
   - Automatically executes translated target code in the compilation sandbox to verify syntax and output.
7. **Code Improvement & Optimization**:
   - Big-O algorithmic time and space complexity audits.
   - Readability refactoring and self-documenting comments.
   - Automated unit test generation.
   - Defensive edge-case reviews (null, zero, overflow, boundary checks).
8. **Compilation History & Snapshots**:
   - Immutable versioned records of every compilation attempt, exit status, duration, and output.
   - Code snapshot inspector with one-click "Restore into Playground".
9. **Analytics & Recurring Mistakes Engine**:
   - Real-time success rate calculations, language distribution breakdown, and quiz accuracy.
   - Engine that categorizes and counts recurring error patterns over time.
10. **Projects & Workspaces**:
    - Multi-file project persistence backed by SQLite in WAL mode.

---

## Local Development & Setup

### Prerequisites
- Node.js (v18+)
- LLVM MinGW / GCC / Clang (for native C/C++ compilation)
- Python 3.10+ (for Python execution)

### Quick Run
```bash
# 1. Install dependencies
npm install --prefix server
npm install --prefix client

# 2. Run automated backend tests
npm test --prefix server

# 3. Start development servers
# Terminal 1 (Backend API on http://localhost:5000):
npm run dev --prefix server

# Terminal 2 (Frontend Client on http://localhost:3000):
npm run dev --prefix client
```

Open `http://localhost:3000/` in your browser.

---

## Environment Variables (`server/.env`)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret-key-here
DB_PATH=./smart_compiler.db
MAX_EXEC_TIME_MS=5000
MAX_OUTPUT_BYTES=65536

# AI Provider: 'heuristic' (built-in offline engine), 'groq', 'openrouter', 'gemini', 'ollama'
AI_PROVIDER=heuristic
AI_API_KEY=
AI_MODEL=llama-3.3-70b-versatile
```
