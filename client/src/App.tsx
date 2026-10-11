import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { TopBar } from './components/TopBar.js';
import { AuthModal } from './components/AuthModal.js';
import { DashboardView } from './views/DashboardView.js';
import { CompilerView } from './views/CompilerView.js';
import { AIExplanationView } from './views/AIExplanationView.js';
import { StudyView } from './views/StudyView.js';
import { TranslatorView } from './views/TranslatorView.js';
import { ImprovementView } from './views/ImprovementView.js';
import { HistoryView } from './views/HistoryView.js';
import { AnalyticsView } from './views/AnalyticsView.js';
import { ProjectsView } from './views/ProjectsView.js';
import { SettingsView } from './views/SettingsView.js';
import { AppView, SupportedLanguage, CompilationResult, User } from './types/index.js';
import { LANGUAGE_CONFIGS } from './utils/constants.js';
import { api, getToken, clearToken } from './services/api.js';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [language, setLanguage] = useState<SupportedLanguage>('cpp');
  const [code, setCode] = useState<string>(LANGUAGE_CONFIGS.cpp.defaultCode);
  const [stdin, setStdin] = useState<string>('');
  const [lastCompilationResult, setLastCompilationResult] = useState<CompilationResult | null>(null);
  const [compilerHealth, setCompilerHealth] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Initialize health and user session
  useEffect(() => {
    api.getHealth()
      .then(setCompilerHealth)
      .catch((err) => console.error('Health check failed:', err));

    const token = getToken();
    if (token) {
      api.getMe()
        .then((res) => setUser(res.user))
        .catch(() => {
          clearToken();
          initGuest();
        });
    } else {
      initGuest();
    }
  }, []);

  const initGuest = async () => {
    try {
      const res = await api.guestLogin();
      setUser(res.user);
    } catch {
      setUser({ id: 'guest-default', displayName: 'Guest Developer', isGuest: true });
    }
  };

  const handleLogout = () => {
    clearToken();
    initGuest();
  };

  const handleNavigateToExplanation = (res: CompilationResult) => {
    setLastCompilationResult(res);
    setCurrentView('explanation');
  };

  const handleNavigateToAutoFix = (res: CompilationResult) => {
    setLastCompilationResult(res);
    setCurrentView('explanation');
  };

  const handleApplyFixToCode = (fixedCode: string) => {
    setCode(fixedCode);
  };

  const handleRestoreFromHistory = (restoredCode: string, restoredLang: string) => {
    setCode(restoredCode);
    if (restoredLang in LANGUAGE_CONFIGS) {
      setLanguage(restoredLang as SupportedLanguage);
    }
    setCurrentView('compiler');
  };

  const handleLoadProjectIntoCompiler = (projCode: string, projLang: SupportedLanguage) => {
    setCode(projCode);
    setLanguage(projLang);
    setCurrentView('compiler');
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="main-wrapper">
        <TopBar
          currentView={currentView}
          compilerHealth={compilerHealth}
        />

        {/* View Switcher */}
        {currentView === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentView}
            user={user}
          />
        )}

        {currentView === 'compiler' && (
          <CompilerView
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
            stdin={stdin}
            setStdin={setStdin}
            onNavigateToExplanation={handleNavigateToExplanation}
            onNavigateToAutoFix={handleNavigateToAutoFix}
          />
        )}

        {currentView === 'explanation' && (
          <AIExplanationView
            currentCode={code}
            language={language}
            lastCompilationResult={lastCompilationResult}
            onApplyFixToCode={handleApplyFixToCode}
            onNavigateToCompiler={() => setCurrentView('compiler')}
          />
        )}

        {currentView === 'study' && (
          <StudyView
            language={language}
          />
        )}

        {currentView === 'translator' && (
          <TranslatorView
            initialCode={code}
            initialLang={language}
          />
        )}

        {currentView === 'improvement' && (
          <ImprovementView
            initialCode={code}
            language={language}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            onRestoreCode={handleRestoreFromHistory}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView />
        )}

        {currentView === 'projects' && (
          <ProjectsView
            onLoadProjectIntoCompiler={handleLoadProjectIntoCompiler}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            user={user}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />
    </div>
  );
}

export default App;
