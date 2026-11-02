import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Layers,
  FileText,
  AlertTriangle,
  GitMerge,
  Trash2,
  Edit2,
  CheckCircle,
  Filter,
  Check
} from 'lucide-react';
import { Question, Module, Paper } from '../types';
import { api } from '../services/api';

interface QuestionsManagerProps {
  subjectId: string;
  modules: Module[];
  papers: Paper[];
  onRefresh: () => void;
}

export const QuestionsManager: React.FC<QuestionsManagerProps> = ({
  subjectId,
  modules,
  papers,
  onRefresh
}) => {
  // Manual Entry Form State
  const [questionText, setQuestionText] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [marks, setMarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Live Similarity Alert
  const [liveSuggestion, setLiveSuggestion] = useState<{
    canonicalQuestionText: string;
    similarity: number;
    explanation: string;
    questionId: string;
  } | null>(null);

  // Question List State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [editingQuestion, setEditingQuestion] = useState<{ id: string; text: string; moduleId: string } | null>(null);

  // Fetch full questions list
  useEffect(() => {
    loadSubjectQuestions();
  }, [subjectId, modules]);

  const loadSubjectQuestions = async () => {
    try {
      const sub = await api.getSubject(subjectId);
      const allQs: Question[] = [];
      if (sub && sub.modules) {
        for (const m of sub.modules) {
          if (m.questions) {
            for (const q of m.questions) {
              allQs.push({
                ...q,
                module: { id: m.id, moduleName: m.moduleName, order: m.order, subjectId }
              });
            }
          }
        }
      }
      setQuestions(allQs);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  // Debounced similarity check as user types question text
  useEffect(() => {
    if (questionText.trim().length < 10) {
      setLiveSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkSimilarity(questionText, subjectId);
        if (res.bestMatch && res.bestMatch.similarity >= 55) {
          setLiveSuggestion({
            questionId: res.bestMatch.questionId,
            canonicalQuestionText: res.bestMatch.canonicalQuestionText,
            similarity: res.bestMatch.similarity,
            explanation: res.bestMatch.explanation
          });
        } else {
          setLiveSuggestion(null);
        }
      } catch (e) {
        setLiveSuggestion(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [questionText, subjectId]);

  const togglePaperSelection = (paperId: string) => {
    setSelectedPaperIds(prev =>
      prev.includes(paperId) ? prev.filter(id => id !== paperId) : [...prev, paperId]
    );
  };

  const handleSelectAllPapers = () => {
    if (selectedPaperIds.length === papers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(papers.map(p => p.id));
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setFormError('Please enter question text');
      return;
    }
    if (!selectedModuleId) {
      setFormError('Please select a module');
      return;
    }
    if (selectedPaperIds.length === 0) {
      setFormError('Please select at least one paper where this question appeared');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await api.createQuestionManual({
        canonicalQuestionText: questionText.trim(),
        moduleId: selectedModuleId,
        paperIds: selectedPaperIds,
        marks: marks.trim() || undefined
      });

      setFormSuccess(`Question saved and linked to ${selectedPaperIds.length} paper(s)!`);
      setQuestionText('');
      setMarks('');
      setSelectedPaperIds([]);
      setLiveSuggestion(null);
      onRefresh();
      loadSubjectQuestions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Are you sure you want to delete this question? Its paper occurrences and frequency stats will be removed.')) {
      return;
    }
    try {
      await api.deleteQuestion(qId);
      onRefresh();
      loadSubjectQuestions();
    } catch (err: any) {
      alert('Failed to delete question: ' + err.message);
    }
  };

  const handleSaveQuestionEdit = async () => {
    if (!editingQuestion || !editingQuestion.text.trim()) return;
    try {
      await api.updateQuestion(editingQuestion.id, {
        canonicalQuestionText: editingQuestion.text.trim(),
        moduleId: editingQuestion.moduleId
      });
      setEditingQuestion(null);
      onRefresh();
      loadSubjectQuestions();
    } catch (err: any) {
      alert('Failed to update question: ' + err.message);
    }
  };

  // Filter questions list
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = searchTerm.trim() === '' ||
      q.canonicalQuestionText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === 'ALL' || q.moduleId === moduleFilter;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-8">
      {/* METHOD B: MANUAL ENTRY FORM */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <Edit2 className="w-5 h-5 text-teal-600" />
          <h3 className="text-base font-bold text-slate-900">
            Method B: Manual Question Entry
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Manually input questions and specify which examination papers contain them. Frequency counts and percentages update automatically.
        </p>

        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Text <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Explain the five V's of Big Data with neat diagram."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />

            {/* LIVE SIMILARITY WARNING BANNER */}
            {liveSuggestion && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-start space-x-2 text-amber-900 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">
                    Potential Duplicate Detected ({liveSuggestion.similarity}% Similarity):
                  </span>
                  <p className="italic mt-0.5 font-normal">
                    "{liveSuggestion.canonicalQuestionText}"
                  </p>
                  <p className="text-3xs text-amber-700 mt-0.5">
                    {liveSuggestion.explanation}. If this is the same question, consider linking it under the Deduplication tab or selecting that question.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Module Selection <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {modules.map(mod => (
                  <option key={mod.id} value={mod.id}>
                    {mod.moduleName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marks / Weightage <span className="text-slate-400 text-3xs">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 10 Marks, 8M"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
              </input>
            </div>
          </div>

          {/* Paper Selection (Multiselect checkboxes) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Select Papers Containing This Question <span className="text-rose-500">*</span>
              </label>
              {papers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllPapers}
                  className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                >
                  {selectedPaperIds.length === papers.length ? 'Deselect All' : 'Select All Papers'}
                </button>
              )}
            </div>

            {papers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No papers uploaded yet. Please upload PYQ papers under the "Upload & PYQs" tab first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                {papers.map(paper => {
                  const isChecked = selectedPaperIds.includes(paper.id);
                  return (
                    <label
                      key={paper.id}
                      className={`flex items-center space-x-2 p-2 rounded border text-xs cursor-pointer select-none transition-colors ${
                        isChecked
                          ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePaperSelection(paper.id)}
                        className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{paper.paperName} {paper.year ? `(${paper.year})` : ''}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <span className="text-3xs text-slate-500 mt-1 block">
              Selected: <strong>{selectedPaperIds.length}</strong> of <strong>{papers.length}</strong> available papers
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || papers.length === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add Question & Record Occurrences'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ALL QUESTIONS DIRECTORY */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              All Questions in Subject ({questions.length})
            </h4>
            <p className="text-xs text-slate-500">
              Browse, filter, edit canonical wording, or reassign modules
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Modules</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.moduleName}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No questions found matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredQuestions.map((q) => {
              const isEditing = editingQuestion?.id === q.id;
              const occCount = q.occurrences?.length || 0;

              return (
                <div key={q.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={editingQuestion.text}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-teal-500 rounded text-xs focus:outline-none"
                      />
                      <div className="flex items-center justify-between">
                        <select
                          value={editingQuestion.moduleId}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, moduleId: e.target.value })}
                          className="px-2 py-1 border border-slate-300 rounded text-xs"
                        >
                          {modules.map(m => (
                            <option key={m.id} value={m.id}>{m.moduleName}</option>
                          ))}
                        </select>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={handleSaveQuestionEdit}
                            className="px-2.5 py-1 bg-teal-600 text-white rounded text-xs font-semibold"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingQuestion(null)}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {q.module?.moduleName || 'Unassigned'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {occCount} Paper{occCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 text-sm">
                          {q.canonicalQuestionText}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => setEditingQuestion({ id: q.id, text: q.canonicalQuestionText, moduleId: q.moduleId })}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Edit question text"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
