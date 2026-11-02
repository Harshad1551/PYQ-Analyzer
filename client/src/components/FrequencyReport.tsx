import React, { useState, useMemo } from 'react';
import {
  FileDown,
  Printer,
  Search,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Filter,
  ArrowUpDown,
  Layers,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { FrequencyReportData, ReportQuestion, ReportModule } from '../types';
import { exportReportToPDF, exportReportToExcel, exportReportToCSV } from '../utils/exportUtils';
import { api } from '../services/api';

interface FrequencyReportProps {
  report: FrequencyReportData;
  onRefresh: () => void;
}

export const FrequencyReport: React.FC<FrequencyReportProps> = ({ report, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [onlySingleAppearance, setOnlySingleAppearance] = useState(false);
  const [onlyRepeated, setOnlyRepeated] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    // Default all expanded
    const initial: Record<string, boolean> = {};
    report.modules.forEach(m => { initial[m.id] = true; });
    return initial;
  });
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleRemoveQuestion = async (qId: string, qText: string, moduleName: string, isManual?: boolean) => {
    const confirmPrompt = isManual
      ? `Remove manually added question from "${moduleName}"?\n\n"${qText}"\n\nThis will remove it from the module and recalculate all repetition counts.`
      : `Remove question from "${moduleName}"?\n\n"${qText}"\n\nThis will remove it from the module and recalculate all repetition counts.`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setDeletingId(qId);
    try {
      await api.deleteQuestion(qId);
      setFeedbackMsg({
        text: `Question removed from "${moduleName}" successfully!`,
        type: 'success'
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        text: err.message || 'Failed to remove question',
        type: 'error'
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const expandAllModules = () => {
    const all: Record<string, boolean> = {};
    report.modules.forEach(m => { all[m.id] = true; });
    setExpandedModules(all);
  };

  const collapseAllModules = () => {
    const all: Record<string, boolean> = {};
    report.modules.forEach(m => { all[m.id] = false; });
    setExpandedModules(all);
  };

  // Filtered and sorted modules
  const processedModules = useMemo(() => {
    return report.modules
      .filter(mod => selectedModuleFilter === 'ALL' || mod.id === selectedModuleFilter)
      .map(mod => {
        let questions = [...mod.questions];

        // Search term filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          questions = questions.filter(q =>
            q.canonicalQuestionText.toLowerCase().includes(term) ||
            q.occurrences.some(o => o.originalQuestionText.toLowerCase().includes(term))
          );
        }

        // Single appearance filter
        if (onlySingleAppearance) {
          questions = questions.filter(q => q.repetitionCount === 1);
        }

        // Only repeated filter (>1)
        if (onlyRepeated) {
          questions = questions.filter(q => q.repetitionCount > 1);
        }

        // Sorting by repetition count
        questions.sort((a, b) => {
          if (sortOrder === 'desc') {
            return b.repetitionCount - a.repetitionCount || a.canonicalQuestionText.localeCompare(b.canonicalQuestionText);
          } else {
            return a.repetitionCount - b.repetitionCount || a.canonicalQuestionText.localeCompare(b.canonicalQuestionText);
          }
        });

        return {
          ...mod,
          questions
        };
      });
  }, [report, searchTerm, selectedModuleFilter, onlySingleAppearance, onlyRepeated, sortOrder]);

  const totalFilteredQuestions = useMemo(() => {
    return processedModules.reduce((acc, m) => acc + m.questions.length, 0);
  }, [processedModules]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls & Export Toolbar (hidden during print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question text or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Module Filter & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedModuleFilter}
                onChange={(e) => setSelectedModuleFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Modules ({report.modules.length})</option>
                {report.modules.map(m => (
                  <option key={m.id} value={m.id}>{m.moduleName}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'Most Repeated First' : 'Least Repeated First'}</span>
            </button>

            <button
              onClick={() => {
                setOnlyRepeated(prev => !prev);
                if (!onlyRepeated) setOnlySingleAppearance(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                onlyRepeated
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Repeated Only (&gt;1)
            </button>

            <button
              onClick={() => {
                setOnlySingleAppearance(prev => !prev);
                if (!onlySingleAppearance) setOnlyRepeated(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                onlySingleAppearance
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Single Appearance (1x)
            </button>
          </div>
        </div>

        {/* Export & Print Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Showing <strong className="text-slate-800">{totalFilteredQuestions}</strong> questions</span>
            <span>•</span>
            <button
              onClick={expandAllModules}
              className="text-teal-600 hover:underline font-medium"
            >
              Expand All
            </button>
            <span>/</span>
            <button
              onClick={collapseAllModules}
              className="text-teal-600 hover:underline font-medium"
            >
              Collapse All
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportReportToPDF(report)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => exportReportToExcel(report)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => exportReportToCSV(report)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner for deletions/updates */}
      {feedbackMsg && (
        <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between no-print ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Report Container matching the screenshot layout */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 print:p-0 print:border-none print:shadow-none">
        
        {/* SUBJECT HEADER */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-xs font-bold tracking-wider text-teal-600 uppercase">
                Frequency Analysis Report
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 uppercase">
                SUBJECT: {report.subject.name}
              </h1>
              {report.subject.subjectCode && (
                <span className="inline-block mt-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Code: {report.subject.subjectCode}
                </span>
              )}
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-right sm:text-right shrink-0">
              <span className="text-xs uppercase tracking-wide text-teal-700 font-semibold block">
                Total PYQ Papers
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-800">
                {report.totalAvailablePapers}
              </span>
              <span className="text-xs text-teal-600 block mt-0.5">available for this subject</span>
            </div>
          </div>

          {report.subject.description && (
            <p className="text-sm text-slate-600 mt-3 italic max-w-3xl">
              {report.subject.description}
            </p>
          )}

          {/* Quick summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 no-print">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <span className="text-xs text-slate-500 block">Total Modules</span>
              <span className="text-lg font-bold text-slate-800">{report.summary.totalModules}</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <span className="text-xs text-slate-500 block">Total Questions</span>
              <span className="text-lg font-bold text-slate-800">{report.summary.totalQuestions}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
              <span className="text-xs text-emerald-700 block font-medium">High Repetition (≥50%)</span>
              <span className="text-lg font-bold text-emerald-800">{report.summary.highFrequencyQuestions}</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <span className="text-xs text-slate-500 block">Single Occurrence</span>
              <span className="text-lg font-bold text-slate-700">{report.summary.singleAppearanceQuestions}</span>
            </div>
          </div>
        </div>

        {/* MODULES LIST */}
        <div className="space-y-8">
          {processedModules.map((module) => {
            const isExpanded = expandedModules[module.id] ?? true;

            return (
              <div
                key={module.id}
                className="rounded-lg border border-slate-200 overflow-hidden print-break-inside-avoid shadow-xs"
              >
                {/* MODULE HEADER BAR */}
                <div
                  onClick={() => toggleModule(module.id)}
                  className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <button className="text-slate-300 hover:text-white no-print">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                      {module.moduleName}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded-full font-medium border border-slate-600">
                      {module.questions.length} Questions
                    </span>
                  </div>
                </div>

                {/* MODULE TABLE */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    {module.questions.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400 bg-white">
                        No questions found matching current filters in this module.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-4 w-12 text-center">#</th>
                            <th className="py-2.5 px-4">Question</th>
                            <th className="py-2.5 px-4 text-center w-24">Marks</th>
                            <th className="py-2.5 px-4 text-center w-28">Repeated in</th>
                            <th className="py-2.5 px-4 text-center w-24">Frequency</th>
                            <th className="py-2.5 px-4 text-center w-24 no-print">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {module.questions.map((q, qIndex) => {
                            const isHighRepeat = q.repetitionPercentage >= 70;
                            const isMediumRepeat = q.repetitionPercentage >= 40 && q.repetitionPercentage < 70;
                            const isQuestionExpanded = expandedQuestions[q.id];

                            return (
                              <React.Fragment key={q.id}>
                                <tr
                                  onClick={() => toggleQuestion(q.id)}
                                  className={`group cursor-pointer transition-colors hover:bg-teal-50/40 ${
                                    isQuestionExpanded ? 'bg-teal-50/30' : qIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                  }`}
                                >
                                  {/* Row Number */}
                                  <td className="py-3 px-4 text-center text-xs font-mono text-slate-400 group-hover:text-teal-600">
                                    {qIndex + 1}
                                  </td>

                                  {/* Question Text */}
                                  <td className="py-3 px-4 text-slate-800 font-medium">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center flex-wrap gap-1.5">
                                        <span className="leading-snug">{q.canonicalQuestionText}</span>
                                        {q.isManual && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Manually added question">
                                            Manual
                                          </span>
                                        )}
                                      </div>
                                      {q.occurrences.length > 1 && (
                                        <span className="ml-2 text-xs font-normal text-slate-400 hidden group-hover:inline-block shrink-0 no-print">
                                          {isQuestionExpanded ? 'Hide occurrences ▲' : 'View occurrences ▼'}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Marks Column (Ahead of Repeated In) */}
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                      {q.marks || '—'}
                                    </span>
                                  </td>

                                  {/* Repetition Fraction (e.g. 7/8, 6/8) */}
                                  <td className="py-3 px-4 text-center font-bold text-slate-900 whitespace-nowrap">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-xs sm:text-sm font-bold ${
                                        isHighRepeat
                                          ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                          : isMediumRepeat
                                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {q.repetitionFraction}
                                    </span>
                                  </td>

                                  {/* Repetition Percentage (e.g. 88%, 75%) */}
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <span
                                      className={`text-xs sm:text-sm font-semibold font-mono ${
                                        isHighRepeat
                                          ? 'text-teal-700'
                                          : isMediumRepeat
                                          ? 'text-sky-700'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {q.repetitionPercentage}%
                                    </span>
                                  </td>

                                  {/* Removal Action Button */}
                                  <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveQuestion(q.id, q.canonicalQuestionText, module.moduleName, q.isManual);
                                      }}
                                      disabled={deletingId === q.id}
                                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-2xs transition-colors ${
                                        q.isManual
                                          ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-semibold'
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      }`}
                                      title={q.isManual ? "Remove manually added question from module" : "Remove question from module"}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove</span>
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Occurrences Details */}
                                {isQuestionExpanded && (
                                  <tr className="bg-slate-50/90 no-print">
                                    <td colSpan={6} className="py-3 px-6 text-xs border-y border-slate-200">
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2 text-slate-500 font-medium">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                          <span>
                                            Appeared in <strong>{q.occurrences.length}</strong> distinct paper{q.occurrences.length > 1 ? 's' : ''}:
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5">
                                          {q.occurrences.map((occ, occIdx) => (
                                            <div
                                              key={occ.id || occIdx}
                                              className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-1"
                                            >
                                              <div className="flex items-center justify-between text-slate-600 font-semibold">
                                                <span>{occ.paperName} {occ.paperYear ? `(${occ.paperYear})` : ''}</span>
                                                {occ.marks && (
                                                  <span className="text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono text-3xs border border-teal-200">
                                                    {occ.marks}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-slate-700 italic font-normal">
                                                "{occ.originalQuestionText}"
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Report Footer / Signature */}
        <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            PYQ Frequency Analyzer • Generated from {report.totalAvailablePapers} registered examination papers.
          </div>
          <div className="font-mono text-slate-400">
            Deduplicated & Analyzed Locally • Confidential Study Material
          </div>
        </div>

      </div>
    </div>
  );
};
