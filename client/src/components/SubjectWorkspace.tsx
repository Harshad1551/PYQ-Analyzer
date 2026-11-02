import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Layers,
  Edit3,
  GitMerge,
  ArrowLeft,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { SubjectSummary, Paper, Module, FrequencyReportData } from '../types';
import { api } from '../services/api';
import { FrequencyReport } from './FrequencyReport';
import { PapersManager } from './PapersManager';
import { ModulesManager } from './ModulesManager';
import { QuestionsManager } from './QuestionsManager';
import { SimilarityManager } from './SimilarityManager';
import { ExtractionReviewModal } from './ExtractionReviewModal';

interface SubjectWorkspaceProps {
  subjectId: string;
  onBack: () => void;
}

export const SubjectWorkspace: React.FC<SubjectWorkspaceProps> = ({ subjectId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'papers' | 'modules' | 'questions' | 'similarity'>('report');
  const [subjectData, setSubjectData] = useState<any>(null);
  const [reportData, setReportData] = useState<FrequencyReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extraction review modal
  const [reviewPaper, setReviewPaper] = useState<Paper | null>(null);

  useEffect(() => {
    loadWorkspaceData();
  }, [subjectId]);

  const loadWorkspaceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subject, report] = await Promise.all([
        api.getSubject(subjectId),
        api.getFrequencyReport(subjectId)
      ]);
      setSubjectData(subject);
      setReportData(report);
    } catch (err: any) {
      setError(err.message || 'Failed to load subject workspace');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !subjectData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading subject workspace...</p>
      </div>
    );
  }

  if (error || !subjectData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <p className="text-sm font-semibold">{error || 'Subject not found'}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const papers: Paper[] = subjectData.papers || [];
  const modules: Module[] = subjectData.modules || [];
  const totalAvailablePapers = papers.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Workspace Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors mt-0.5"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {subjectData.name}
                </h1>
                {subjectData.subjectCode && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {subjectData.subjectCode}
                  </span>
                )}
              </div>
              {subjectData.description && (
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">{subjectData.description}</p>
              )}
            </div>
          </div>

          {/* Prominent Total Available Papers Badge */}
          <div className="flex items-center space-x-3">
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                Total PYQ Papers
              </span>
              <div className="flex items-baseline justify-end space-x-1">
                <span className="text-2xl font-black text-teal-800">{totalAvailablePapers}</span>
                <span className="text-xs text-teal-600 font-medium">available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'report'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Frequency Report</span>
          </button>

          <button
            onClick={() => setActiveTab('papers')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'papers'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload & PYQ Papers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-3xs font-mono ${
              activeTab === 'papers' ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {papers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('modules')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'modules'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Modules</span>
            <span className={`px-1.5 py-0.2 rounded-full text-3xs font-mono ${
              activeTab === 'modules' ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {modules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'questions'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Questions & Manual Entry</span>
          </button>

          <button
            onClick={() => setActiveTab('similarity')}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'similarity'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>Deduplication & Matching</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'report' && reportData && (
          <FrequencyReport report={reportData} onRefresh={loadWorkspaceData} />
        )}

        {activeTab === 'papers' && (
          <PapersManager
            subjectId={subjectId}
            papers={papers}
            totalAvailablePapers={totalAvailablePapers}
            onRefresh={loadWorkspaceData}
            onOpenExtractionReview={(paper) => setReviewPaper(paper)}
          />
        )}

        {activeTab === 'modules' && (
          <ModulesManager
            subjectId={subjectId}
            modules={modules}
            onRefresh={loadWorkspaceData}
          />
        )}

        {activeTab === 'questions' && (
          <QuestionsManager
            subjectId={subjectId}
            modules={modules}
            papers={papers}
            onRefresh={loadWorkspaceData}
          />
        )}

        {activeTab === 'similarity' && (
          <SimilarityManager
            subjectId={subjectId}
            modules={modules}
            onRefresh={loadWorkspaceData}
          />
        )}
      </div>

      {/* Extraction Review Modal */}
      {reviewPaper && (
        <ExtractionReviewModal
          isOpen={Boolean(reviewPaper)}
          paper={reviewPaper}
          modules={modules}
          onClose={() => setReviewPaper(null)}
          onSaved={loadWorkspaceData}
        />
      )}
    </div>
  );
};
