import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Play,
  ArrowRight,
  Code2,
  Check,
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { SupportedLanguage } from '../types/index.js';
import { api } from '../services/api.js';

interface StudyViewProps {
  language: SupportedLanguage;
}

export const StudyView: React.FC<StudyViewProps> = ({ language: defaultLang }) => {
  const [topic, setTopic] = useState('Binary Search');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [language, setLanguage] = useState<SupportedLanguage>(defaultLang);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Stage 3 Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, { isCorrect: boolean; explanation: string }>>({});
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

  // Stage 4 Coding Challenge State
  const [challengeCode, setChallengeCode] = useState<string>('');
  const [challengeOutput, setChallengeOutput] = useState<string>('');
  const [isRunningChallenge, setIsRunningChallenge] = useState<boolean>(false);
  const [showReferenceSolution, setShowReferenceSolution] = useState<boolean>(false);

  const startNewSession = async () => {
    setLoading(true);
    try {
      const res = await api.createStudySession({
        topic,
        language,
        level
      });
      // Fetch full session details
      const full = await api.getStudySession(res.sessionId);
      setSession(full);
      setCurrentStage(1);
      setQuizAnswers({});
      setQuizResults({});
      setRevealedHints({});
      setChallengeCode(full.stage_data.stage4_applied?.initialTemplate || '');
      setChallengeOutput('');
      setShowReferenceSolution(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (st: number) => {
    setCurrentStage(st);
    if (session?.id) {
      await api.updateStudyStage(session.id, st);
    }
  };

  const handleQuizSubmit = async (quiz: any, selectedIndex: number) => {
    setQuizAnswers(prev => ({ ...prev, [quiz.id]: selectedIndex }));
    try {
      const res = await api.submitQuiz(quiz.id, selectedIndex);
      setQuizResults(prev => ({ ...prev, [quiz.id]: res }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunChallengeCode = async () => {
    setIsRunningChallenge(true);
    try {
      const res = await api.compile({
        language,
        code: challengeCode
      });
      if (res.status === 'completed' && res.exitCode === 0) {
        setChallengeOutput(`[SUCCESS] Program compiled and executed!\nOutput:\n${res.stdout || '(no output)'}`);
      } else {
        setChallengeOutput(`[ERROR] Execution failed:\n${res.stderr || res.stdout}`);
      }
    } catch (err: any) {
      setChallengeOutput(`Execution error: ${err.message}`);
    } finally {
      setIsRunningChallenge(false);
    }
  };

  const curriculum = session?.stage_data;

  return (
    <div className="content-body" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Session Launcher Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(163, 113, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple)'
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Smart Study — AI Coding Tutor
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4-Stage interactive learning: Concepts, Guided steps, Practice quizzes, and Applied challenges.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select className="select-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="Binary Search">Binary Search</option>
              <option value="Dynamic Programming">Dynamic Programming (Memoization)</option>
              <option value="Recursion & Backtracking">Recursion & Backtracking</option>
              <option value="Pointers & Memory">Pointers & Memory Allocation</option>
              <option value="Sorting Algorithms">Sorting Algorithms & Big-O</option>
              <option value="Linked Lists">Linked Lists & Pointers</option>
            </select>

            <select className="select-input" value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>

            <select className="select-input" value={level} onChange={(e) => setLevel(e.target.value as any)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <button className="btn btn-primary btn-sm" onClick={startNewSession} disabled={loading} id="btn-start-study">
              <Sparkles size={13} />
              <span>{loading ? 'Generating...' : session ? 'New Topic' : 'Start Learning Session'}</span>
            </button>
          </div>
        </div>

        {/* 4-Stage Stepper Navigation */}
        {session && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              overflowX: 'auto'
            }}
          >
            {[
              { num: 1, title: '1. Understand Concept' },
              { num: 2, title: '2. Guided Learning' },
              { num: 3, title: '3. Practice & Quizzes' },
              { num: 4, title: '4. Applied Challenge' }
            ].map((s) => (
              <button
                key={s.num}
                className={`btn btn-sm ${currentStage === s.num ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, minWidth: '150px' }}
                onClick={() => handleStageChange(s.num)}
              >
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!session && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <GraduationCap size={44} style={{ color: 'var(--accent-purple)', marginBottom: '16px', margin: '0 auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Ready to Master Programming Concepts?
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 20px auto' }}>
            Select a topic like <strong>Binary Search</strong>, <strong>Dynamic Programming</strong>, or <strong>Recursion</strong> above and click "Start Learning Session" to begin your structured 4-stage tutorial.
          </p>
          <button className="btn btn-primary" onClick={startNewSession}>
            <span>Start Session with {topic}</span>
          </button>
        </div>
      )}

      {session && curriculum && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* STAGE 1: CONCEPT OVERVIEW */}
          {currentStage === 1 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Stage 1: Core Concept & Prerequisites
                </h3>
                <span className="badge badge-info">{curriculum.estimatedTimeMin} min estimated</span>
              </div>

              <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '20px' }}>
                {curriculum.stage1_concept?.coreIdea}
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                Prerequisites Checklist
              </h4>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                {curriculum.stage1_concept?.prerequisites?.map((p: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{p}</li>
                ))}
              </ul>

              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '10px' }}>
                Key Terminology
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {curriculum.stage1_concept?.terminology?.map((t: any, idx: number) => (
                  <div key={idx} style={{ padding: '10px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{t.term}:</strong>{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{t.definition}</span>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '10px' }}>
                Introductory Example
              </h4>
              <div style={{ padding: '14px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '12.5px', whiteSpace: 'pre-wrap', color: '#e6edf3' }}>
                {curriculum.stage1_concept?.smallExample}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleStageChange(2)}>
                  <span>Continue to Guided Learning</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: GUIDED LEARNING */}
          {currentStage === 2 && (
            <div className="card">
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Stage 2: Step-by-Step Guided Breakdown
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {curriculum.stage2_guided?.steps?.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid var(--accent-blue)'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Step {step.stepNumber}: {step.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      {step.explanation}
                    </div>
                    {step.codeSnippet && (
                      <div style={{ padding: '10px 12px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#7ee787' }}>
                        {step.codeSnippet}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleStageChange(1)}>
                  <span>Back to Concept</span>
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleStageChange(3)}>
                  <span>Proceed to Quizzes</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: INTERACTIVE QUIZZES */}
          {currentStage === 3 && (
            <div className="card">
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Stage 3: Interactive Practice & Assessment
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {session.quizzes?.map((quiz: any, qIdx: number) => {
                  const userAnswer = quizAnswers[quiz.id] !== undefined ? quizAnswers[quiz.id] : quiz.user_answer;
                  const res = quizResults[quiz.id];
                  const hasAnswered = userAnswer !== undefined && userAnswer !== null;

                  return (
                    <div
                      key={quiz.id}
                      style={{
                        padding: '18px',
                        backgroundColor: 'var(--bg-panel)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
                        Question {qIdx + 1}: {quiz.question}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {quiz.options?.map((opt: string, optIdx: number) => {
                          const isSelected = userAnswer === optIdx;
                          let btnStyle = 'var(--bg-surface)';
                          let borderCol = 'var(--border-strong)';

                          if (hasAnswered) {
                            if (optIdx === quiz.correct_index) {
                              btnStyle = 'rgba(46, 160, 67, 0.2)';
                              borderCol = 'var(--accent-green)';
                            } else if (isSelected && !res?.isCorrect) {
                              btnStyle = 'rgba(248, 81, 73, 0.2)';
                              borderCol = 'var(--accent-rose)';
                            }
                          } else if (isSelected) {
                            borderCol = 'var(--accent-blue)';
                          }

                          return (
                            <div
                              key={optIdx}
                              onClick={() => !hasAnswered && handleQuizSubmit(quiz, optIdx)}
                              style={{
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: btnStyle,
                                border: `1px solid ${borderCol}`,
                                cursor: hasAnswered ? 'default' : 'pointer',
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>{opt}</span>
                              {hasAnswered && optIdx === quiz.correct_index && (
                                <Check size={16} style={{ color: 'var(--accent-green)' }} />
                              )}
                              {hasAnswered && isSelected && optIdx !== quiz.correct_index && (
                                <X size={16} style={{ color: 'var(--accent-rose)' }} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Hint Toggle */}
                      {!hasAnswered && (
                        <div>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setRevealedHints(prev => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                          >
                            <Lightbulb size={13} style={{ color: 'var(--accent-amber)' }} />
                            <span>{revealedHints[qIdx] ? 'Hide Hint' : 'Need a Hint?'}</span>
                          </button>
                          {revealedHints[qIdx] && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-amber)' }}>
                              💡 Hint: Check boundary values and zero-indexing rules.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation Reveal */}
                      {hasAnswered && (
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: 'rgba(56, 139, 253, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(56, 139, 253, 0.2)',
                            fontSize: '12.5px',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <strong>Explanation:</strong> {quiz.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleStageChange(2)}>
                  <span>Back to Guided Steps</span>
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleStageChange(4)}>
                  <span>Proceed to Applied Challenge</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: APPLIED CODING CHALLENGE */}
          {currentStage === 4 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Stage 4: Applied Coding Challenge
                </h3>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowReferenceSolution(!showReferenceSolution)}
                >
                  <Code2 size={14} />
                  <span>{showReferenceSolution ? 'Hide Reference' : 'Show Reference Solution'}</span>
                </button>
              </div>

              <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                {curriculum.stage4_applied?.challengeDescription}
              </div>

              {/* Challenge Editor */}
              <div style={{ height: '280px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
                <Editor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={challengeCode}
                  onChange={(v) => setChallengeCode(v || '')}
                  theme="vs-dark"
                  options={{ fontSize: 13, minimap: { enabled: false } }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRunChallengeCode}
                  disabled={isRunningChallenge}
                >
                  <Play size={13} />
                  <span>{isRunningChallenge ? 'Running in Sandbox...' : 'Run Challenge in Sandbox'}</span>
                </button>
              </div>

              {/* Challenge output console */}
              {challengeOutput && (
                <div style={{ padding: '12px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '12.5px', whiteSpace: 'pre-wrap', color: '#f0f6fc', marginBottom: '16px' }}>
                  {challengeOutput}
                </div>
              )}

              {/* Reference solution drawer */}
              {showReferenceSolution && (
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '8px' }}>
                    Reference Implementation & Walkthrough
                  </h4>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {curriculum.stage4_applied?.walkthrough}
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#0d1117', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12.5px', whiteSpace: 'pre-wrap', color: '#7ee787' }}>
                    {curriculum.stage4_applied?.referenceSolution}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
