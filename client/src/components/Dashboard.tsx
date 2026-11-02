import React from 'react';
import {
  BookOpen,
  FileText,
  Layers,
  HelpCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Trash2,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { SubjectSummary } from '../types';

interface DashboardProps {
  subjects: SubjectSummary[];
  onSelectSubject: (id: string) => void;
  onOpenNewSubject: () => void;
  onDeleteSubject: (id: string, name: string) => void;
  onLoadDemo: () => void;
  isDemoLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  subjects,
  onSelectSubject,
  onOpenNewSubject,
  onDeleteSubject,
  onLoadDemo,
  isDemoLoading
}) => {
  const totalPapers = subjects.reduce((sum, s) => sum + s.totalPapers, 0);
  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  // Find overall highest repeated question across all subjects
  let topOverallQuestion: { text: string; count: number; percentage: number; subjectName: string } | null = null;
  let maxCount = -1;

  for (const s of subjects) {
    if (s.topRepeatedQuestion && s.topRepeatedQuestion.count > maxCount) {
      maxCount = s.topRepeatedQuestion.count;
      topOverallQuestion = {
        ...s.topRepeatedQuestion,
        subjectName: s.name
      };
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome / Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Exam Pattern Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Analyze Previous-Year Question Papers & Frequency Patterns
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upload university examination papers in PDF format. Group equivalent questions with local offline similarity algorithms, and generate sorted frequency reports showing exactly which questions appear most often.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onOpenNewSubject}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Subject</span>
            </button>
            <button
              onClick={onLoadDemo}
              disabled={isDemoLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-teal-200 border border-teal-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{isDemoLoading ? 'Loading Sample...' : 'Load Sample Subject (Big Data Analytics - 8 Papers)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subjects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Subjects</span>
            <span className="text-2xl font-extrabold text-slate-900">{subjects.length}</span>
            <span className="text-3xs text-slate-400 block">configured in workspace</span>
          </div>
        </div>

        {/* Total Uploaded Papers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Uploaded Papers</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalPapers}</span>
            <span className="text-3xs text-slate-400 block">distinct PYQ exam papers</span>
          </div>
        </div>

        {/* Total Questions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Questions</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalQuestions}</span>
            <span className="text-3xs text-slate-400 block">tracked across modules</span>
          </div>
        </div>

        {/* Top Repeated Question */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-medium text-slate-500 block">Top Repeated Question</span>
            {topOverallQuestion ? (
              <div>
                <span className="text-xl font-extrabold text-slate-900">
                  {topOverallQuestion.percentage}% ({topOverallQuestion.count} papers)
                </span>
                <span className="text-3xs text-slate-400 truncate block mt-0.5">
                  {topOverallQuestion.subjectName}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">No data yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Subjects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Exam Subjects</h2>
            <p className="text-xs text-slate-500">
              Select a subject to open its workspace, upload question papers, or view frequency reports
            </p>
          </div>
          <button
            onClick={onOpenNewSubject}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Subjects Created Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by creating your first subject or loading our pre-configured Big Data Analytics sample dataset.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onOpenNewSubject}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                Create First Subject
              </button>
              <button
                onClick={onLoadDemo}
                disabled={isDemoLoading}
                className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
              >
                Load Sample Demo (8 Papers)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-400 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        onClick={() => onSelectSubject(subject.id)}
                        className="text-base font-bold text-slate-900 group-hover:text-teal-600 cursor-pointer transition-colors"
                      >
                        {subject.name}
                      </h3>
                      {subject.subjectCode && (
                        <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 mt-1 inline-block">
                          {subject.subjectCode}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteSubject(subject.id, subject.name)}
                      className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {subject.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {subject.description}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-slate-400 block text-3xs uppercase font-medium">Papers</span>
                      <span className="font-extrabold text-teal-700 text-sm">{subject.totalPapers}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs uppercase font-medium">Modules</span>
                      <span className="font-extrabold text-slate-800 text-sm">{subject.totalModules}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs uppercase font-medium">Questions</span>
                      <span className="font-extrabold text-slate-800 text-sm">{subject.totalQuestions}</span>
                    </div>
                  </div>

                  {/* Top Repeated Highlight if present */}
                  {subject.topRepeatedQuestion && (
                    <div className="bg-teal-50/70 border border-teal-100 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between text-teal-900 font-bold text-3xs">
                        <span>TOP REPEATED QUESTION</span>
                        <span className="font-mono bg-teal-200/60 px-1.5 py-0.2 rounded">
                          {subject.topRepeatedQuestion.count}/{subject.totalPapers} ({subject.topRepeatedQuestion.percentage}%)
                        </span>
                      </div>
                      <p className="text-teal-950 text-2xs italic line-clamp-2">
                        "{subject.topRepeatedQuestion.text}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-3xs text-slate-400">
                    Updated {new Date(subject.updatedAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => onSelectSubject(subject.id)}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-teal-600 hover:text-teal-800 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
