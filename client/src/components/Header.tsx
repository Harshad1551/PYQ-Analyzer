import React from 'react';
import { BookOpen, Sparkles, Plus, RotateCcw, BarChart3, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentView: 'dashboard' | 'workspace';
  activeSubjectName?: string;
  onNavigateHome: () => void;
  onOpenNewSubject: () => void;
  onLoadDemo: () => void;
  onResetData: () => void;
  isDemoLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeSubjectName,
  onNavigateHome,
  onOpenNewSubject,
  onLoadDemo,
  onResetData,
  isDemoLoading
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">PYQ Frequency Analyzer</span>
                <span className="bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full font-medium border border-teal-200">
                  v1.0 Local
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Subject-Wise Examination Repetition Intelligence</p>
            </div>
          </div>

          {/* Breadcrumb if inside workspace */}
          {currentView === 'workspace' && activeSubjectName && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
              <button
                onClick={onNavigateHome}
                className="hover:text-teal-600 flex items-center space-x-1 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <span className="text-slate-400">/</span>
              <span className="font-semibold text-slate-900 truncate max-w-xs">{activeSubjectName}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              title="Load sample Big Data Analytics subject with 8 papers and 5 modules"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>{isDemoLoading ? 'Loading Demo...' : 'Load Sample (8 Papers)'}</span>
            </button>

            <button
              onClick={onOpenNewSubject}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Subject</span>
            </button>

            <button
              onClick={onResetData}
              title="Reset all database records"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
