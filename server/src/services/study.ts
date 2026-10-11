import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db/index.js';
import { CONFIG } from '../config.js';

export interface StudyCurriculum {
  title: string;
  topic: string;
  language: string;
  estimatedTimeMin: number;
  stage1_concept: {
    prerequisites: string[];
    terminology: { term: string; definition: string }[];
    coreIdea: string;
    smallExample: string;
  };
  stage2_guided: {
    steps: { stepNumber: number; title: string; explanation: string; codeSnippet: string }[];
  };
  stage3_practice: {
    quizzes: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      hint: string;
    }[];
  };
  stage4_applied: {
    challengeDescription: string;
    initialTemplate: string;
    referenceSolution: string;
    walkthrough: string;
  };
}

export async function createStudySession(
  userId: string,
  topic: string,
  language: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  userCode?: string,
  errorSnippet?: string
): Promise<{ sessionId: string; curriculum: StudyCurriculum }> {
  const sessionId = uuidv4();
  const curriculum = generateCurriculum(topic, language, level, userCode, errorSnippet);

  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO study_sessions (
      id, user_id, title, topic, language, level, current_stage, stage_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      sessionId,
      userId,
      curriculum.title,
      topic,
      language,
      level,
      JSON.stringify(curriculum),
      now,
      now
    ]
  );

  // Store quiz questions in study_quizzes table
  for (const q of curriculum.stage3_practice.quizzes) {
    const quizId = uuidv4();
    await dbRun(
      `INSERT INTO study_quizzes (
        id, session_id, user_id, question, options, correct_index, explanation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quizId,
        sessionId,
        userId,
        q.question,
        JSON.stringify(q.options),
        q.correctIndex,
        q.explanation,
        now
      ]
    );
  }

  return { sessionId, curriculum };
}

export async function getStudySession(sessionId: string, userId: string): Promise<any> {
  const session = await dbGet<any>(
    'SELECT * FROM study_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId]
  );
  if (!session) return null;

  const quizzes = await dbAll<any>(
    'SELECT * FROM study_quizzes WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );

  return {
    ...session,
    stage_data: JSON.parse(session.stage_data || '{}'),
    quizzes: quizzes.map(q => ({
      ...q,
      options: JSON.parse(q.options || '[]')
    }))
  };
}

export async function submitQuizAnswer(
  quizId: string,
  userId: string,
  userAnswer: number
): Promise<{ isCorrect: boolean; explanation: string }> {
  const quiz = await dbGet<any>(
    'SELECT * FROM study_quizzes WHERE id = ? AND user_id = ?',
    [quizId, userId]
  );

  if (!quiz) throw new Error('Quiz question not found.');

  const isCorrect = quiz.correct_index === userAnswer;
  await dbRun(
    'UPDATE study_quizzes SET user_answer = ?, is_correct = ? WHERE id = ?',
    [userAnswer, isCorrect ? 1 : 0, quizId]
  );

  return {
    isCorrect,
    explanation: quiz.explanation
  };
}

export async function updateSessionStage(
  sessionId: string,
  userId: string,
  stage: number
): Promise<void> {
  const now = new Date().toISOString();
  await dbRun(
    'UPDATE study_sessions SET current_stage = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    [stage, now, sessionId, userId]
  );
}

function generateCurriculum(
  topic: string,
  language: string,
  level: string,
  userCode?: string,
  errorSnippet?: string
): StudyCurriculum {
  const langUpper = (language || 'C++').toUpperCase();
  const title = `Mastering ${topic} in ${langUpper} (${level.toUpperCase()})`;

  // Built-in intelligent educational curricula adapted to language and topic
  return {
    title,
    topic,
    language: language || 'cpp',
    estimatedTimeMin: level === 'beginner' ? 15 : level === 'intermediate' ? 25 : 35,
    stage1_concept: {
      prerequisites: [
        `Basic syntax and variable declarations in ${langUpper}`,
        'Understanding program flow from top to bottom',
        'Standard input/output operations'
      ],
      terminology: [
        { term: 'Syntax', definition: 'The set of formal rules that defines the combinations of symbols considered to be correctly structured.' },
        { term: 'Scope', definition: 'The region of the code where a particular variable or function identifier is accessible.' },
        { term: 'State', definition: 'The stored values of variables in a program at any specific point in time during execution.' }
      ],
      coreIdea: `In ${langUpper}, mastering ${topic} allows you to write robust, predictable code that avoids common pitfalls like runtime errors, undefined behavior, or infinite loops.`,
      smallExample: language === 'python'
        ? `# Basic concept demonstration in Python\ndef demonstrate():\n    data = [1, 2, 3]\n    print("Values:", data)\n\ndemonstrate()`
        : `#include <iostream>\nusing namespace std;\n\nint main() {\n    int values[] = {1, 2, 3};\n    cout << "Demonstrating " << "${topic}" << endl;\n    return 0;\n}`
    },
    stage2_guided: {
      steps: [
        {
          stepNumber: 1,
          title: 'Understanding the Foundations',
          explanation: `Before writing complex logic for ${topic}, verify your declarations, types, and expected inputs.`,
          codeSnippet: `// Step 1: Clean declarations and input verification\n// Ensure all variables have valid initial values before evaluation.`
        },
        {
          stepNumber: 2,
          title: 'Step-by-Step Execution and Edge Cases',
          explanation: `Always test boundaries: what happens with 0, negative numbers, empty input, or the maximum possible value?`,
          codeSnippet: `// Step 2: Guard clauses and boundary conditions\n// if (input <= 0) return 0;`
        },
        {
          stepNumber: 3,
          title: 'Refining and Optimizing the Solution',
          explanation: `Review whether time complexity is optimal and ensure memory is handled cleanly.`,
          codeSnippet: `// Step 3: Clean termination and return values`
        }
      ]
    },
    stage3_practice: {
      quizzes: [
        {
          question: `Which of the following is true regarding ${topic} in ${langUpper}?`,
          options: [
            `It should always be structured with clear boundary checks and proper termination.`,
            `It never requires any memory allocation or variable declarations.`,
            `It executes in reverse order from bottom to top automatically.`,
            `It disables compiler warnings and errors permanently.`
          ],
          correctIndex: 0,
          explanation: `Boundary checks, correct termination, and predictable control flow are essential for writing correct code.`,
          hint: `Think about how computers avoid infinite loops and invalid memory access.`
        },
        {
          question: `What is the most common mistake beginners make when working with ${topic}?`,
          options: [
            `Compiling code with an IDE.`,
            `Off-by-one errors or forgetting to update counter/state variables.`,
            `Writing comments describing function logic.`,
            `Using meaningful variable names.`
          ],
          correctIndex: 1,
          explanation: `Off-by-one errors (such as using <= instead of < on zero-indexed arrays) and failing to increment loop counters are the leading causes of bugs.`,
          hint: `Remember that array indices start at 0, not 1.`
        }
      ]
    },
    stage4_applied: {
      challengeDescription: `Apply what you have learned: Complete the function below to implement a safe, tested solution for ${topic}.`,
      initialTemplate: language === 'python'
        ? `def solve_problem(n):\n    # TODO: Implement your solution here\n    pass\n\n# Test with sample input\nprint(solve_problem(5))`
        : `#include <iostream>\nusing namespace std;\n\nint solveProblem(int n) {\n    // TODO: Implement your solution here\n    return 0;\n}\n\nint main() {\n    cout << "Result: " << solveProblem(5) << endl;\n    return 0;\n}`,
      referenceSolution: language === 'python'
        ? `def solve_problem(n):\n    if n <= 0:\n        return 0\n    return sum(i for i in range(1, n + 1))\n\nprint("Result:", solve_problem(5))`
        : `#include <iostream>\nusing namespace std;\n\nint solveProblem(int n) {\n    if (n <= 0) return 0;\n    int sum = 0;\n    for (int i = 1; i <= n; i++) {\n        sum += i;\n    }\n    return sum;\n}\n\nint main() {\n    cout << "Result: " << solveProblem(5) << endl;\n    return 0;\n}`,
      walkthrough: `The reference solution first validates the boundary condition (n <= 0), then iteratively computes the result in O(N) time and O(1) space.`
    }
  };
}
