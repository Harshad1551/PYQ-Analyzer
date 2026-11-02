import React, { useState, useEffect } from 'react';
import { SubjectSummary } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SubjectWorkspace } from './components/SubjectWorkspace';
import { NewSubjectModal } from './components/NewSubjectModal';

export const App: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'workspace'>('dashboard');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [isNewSubjectModalOpen, setIsNewSubjectModalOpen] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSubjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSubject = (id: string) => {
    setActiveSubjectId(id);
    setCurrentView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    setCurrentView('dashboard');
    setActiveSubjectId(null);
    loadSubjects();
  };

  const handleCreateSubject = async (data: {
    name: string;
    subjectCode?: string;
    description?: string;
    initialModules?: string[];
  }) => {
    try {
      const created = await api.createSubject(data);
      showToast(`Subject "${created.name}" created successfully!`);
      await loadSubjects();
      handleSelectSubject(created.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to create subject', 'error');
      throw err;
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" and all its uploaded papers, questions, and reports?`)) {
      return;
    }
    try {
      await api.deleteSubject(id);
      showToast(`Subject "${name}" deleted successfully.`);
      if (activeSubjectId === id) {
        handleNavigateHome();
      } else {
        loadSubjects();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete subject', 'error');
    }
  };

  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
      const result = await api.seedDemo();
      showToast('Sample dataset loaded! (Big Data Analytics with 8 examination papers)');
      await loadSubjects();
      if (result.subject && result.subject.id) {
        handleSelectSubject(result.subject.id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to seed sample dataset', 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('WARNING: This will delete ALL subjects, papers, and questions in the database. Are you sure you want to reset?')) {
      return;
    }
    try {
      await api.resetDatabase();
      showToast('Database reset successfully.');
      setCurrentView('dashboard');
      setActiveSubjectId(null);
      loadSubjects();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset database', 'error');
    }
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold border ${
            toastMessage.type === 'success'
              ? 'bg-teal-900 text-white border-teal-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        currentView={currentView}
        activeSubjectName={activeSubject?.name}
        onNavigateHome={handleNavigateHome}
        onOpenNewSubject={() => setIsNewSubjectModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        onResetData={handleResetData}
        isDemoLoading={isDemoLoading}
      />

      {/* Main Content */}
      <main className="flex-1">
        {isLoading && subjects.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-2">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Initializing PYQ Analyzer...</p>
            </div>
          </div>
        ) : currentView === 'workspace' && activeSubjectId ? (
          <SubjectWorkspace
            subjectId={activeSubjectId}
            onBack={handleNavigateHome}
          />
        ) : (
          <Dashboard
            subjects={subjects}
            onSelectSubject={handleSelectSubject}
            onOpenNewSubject={() => setIsNewSubjectModalOpen(true)}
            onDeleteSubject={handleDeleteSubject}
            onLoadDemo={handleLoadDemo}
            isDemoLoading={isDemoLoading}
          />
        )}
      </main>

      {/* Create Subject Modal */}
      <NewSubjectModal
        isOpen={isNewSubjectModalOpen}
        onClose={() => setIsNewSubjectModalOpen(false)}
        onSubmit={handleCreateSubject}
      />
    </div>
  );
};

export default App;
