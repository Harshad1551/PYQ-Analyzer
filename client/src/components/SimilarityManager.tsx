import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  Split,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Layers,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';
import { SimilaritySuggestion, Question, Module } from '../types';
import { api } from '../services/api';

interface SimilarityManagerProps {
  subjectId: string;
  modules: Module[];
  onRefresh: () => void;
}

export const SimilarityManager: React.FC<SimilarityManagerProps> = ({
  subjectId,
  modules,
  onRefresh
}) => {
  const [suggestions, setSuggestions] = useState<SimilaritySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual Merge selector state
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [manualTargetId, setManualTargetId] = useState<string>('');
  const [manualSourceId, setManualSourceId] = useState<string>('');
  const [isMergingManual, setIsMergingManual] = useState(false);

  // Unmerge section state: questions with > 1 occurrence
  const [multiOccQuestions, setMultiOccQuestions] = useState<Question[]>([]);

  useEffect(() => {
    loadSuggestionsAndQuestions();
  }, [subjectId]);

  const loadSuggestionsAndQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [suggs, subData] = await Promise.all([
        api.getSimilaritySuggestions(subjectId),
        api.getSubject(subjectId)
      ]);

      setSuggestions(suggs);

      const qs: Question[] = [];
      if (subData && subData.modules) {
        for (const m of subData.modules) {
          if (m.questions) {
            for (const q of m.questions) {
              qs.push({
                ...q,
                module: { id: m.id, moduleName: m.moduleName, order: m.order, subjectId }
              });
            }
          }
        }
      }
      setAllQuestions(qs);
      setMultiOccQuestions(qs.filter(q => q.occurrences && q.occurrences.length > 1));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch similarity suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveMerge = async (targetId: string, sourceId: string) => {
    try {
      setError(null);
      await api.mergeQuestions(targetId, sourceId);
      setActionMessage('Questions successfully merged and frequencies recalculated!');
      setTimeout(() => setActionMessage(null), 4000);
      loadSuggestionsAndQuestions();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to merge questions');
    }
  };

  const handleDismissSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleManualMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTargetId || !manualSourceId) {
      setError('Please select both Question A and Question B');
      return;
    }
    if (manualTargetId === manualSourceId) {
      setError('Cannot merge a question into itself');
      return;
    }

    setIsMergingManual(true);
    setError(null);
    try {
      await api.mergeQuestions(manualTargetId, manualSourceId);
      setActionMessage('Questions successfully merged!');
      setTimeout(() => setActionMessage(null), 4000);
      setManualTargetId('');
      setManualSourceId('');
      loadSuggestionsAndQuestions();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Manual merge failed');
    } finally {
      setIsMergingManual(false);
    }
  };

  const handleUnmergeOccurrence = async (occurrenceId: string) => {
    if (!window.confirm('Separate this occurrence into its own standalone question?')) {
      return;
    }
    try {
      setError(null);
      await api.unmergeQuestion(occurrenceId);
      setActionMessage('Question occurrence separated into its own question!');
      setTimeout(() => setActionMessage(null), 4000);
      loadSuggestionsAndQuestions();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to unmerge occurrence');
    }
  };

  return (
    <div className="space-y-8">
      {/* Introduction Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h3 className="text-base font-bold text-slate-900">
            Question Matching & Repetition Deduplication
          </h3>
        </div>
        <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
          University examination questions often test the same core concept with slight wording differences across years.
          Our local offline NLP algorithm detects high-semantic matches and suggests them below.
          <strong className="text-slate-800"> Questions are never merged automatically; you retain final editorial control.</strong>
        </p>

        {actionMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* DETECTED SIMILARITY SUGGESTIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitMerge className="w-5 h-5 text-teal-600" />
            <h4 className="text-sm font-bold text-slate-800">
              Suggested Matches for Review ({suggestions.length})
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            Sorted by highest semantic similarity
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-xs">Analyzing question pairs across modules...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
            <Check className="w-8 h-8 mx-auto mb-2 text-teal-500" />
            <p className="font-semibold text-slate-700">No ambiguous duplicate questions detected.</p>
            <p className="text-slate-400 mt-1">All registered questions appear sufficiently distinct, or existing duplicates have already been merged.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((sugg, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-teal-300 transition-all space-y-4"
              >
                {/* Score & rationale badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-teal-100 text-teal-900 border border-teal-300">
                      {sugg.similarity}% Similarity Match
                    </span>
                    {sugg.commonTerms.length > 0 && (
                      <span className="text-3xs text-slate-500 hidden sm:inline">
                        Key concepts: <strong className="text-slate-700">{sugg.commonTerms.join(', ')}</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-3xs text-slate-400 italic">
                    {sugg.explanation}
                  </span>
                </div>

                {/* Side by side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Question A */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider">
                        Question A ({sugg.questionA.moduleName})
                      </span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                        {sugg.questionA.occurrencesCount} Paper(s)
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      "{sugg.questionA.text}"
                    </p>
                    <div className="text-3xs text-slate-500 truncate">
                      Appeared in: {sugg.questionA.papers.join(', ')}
                    </div>
                  </div>

                  {/* Question B */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider">
                        Question B ({sugg.questionB.moduleName})
                      </span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                        {sugg.questionB.occurrencesCount} Paper(s)
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      "{sugg.questionB.text}"
                    </p>
                    <div className="text-3xs text-slate-500 truncate">
                      Appeared in: {sugg.questionB.papers.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Decision controls */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDismissSuggestion(idx)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Keep Separate (Reject)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveMerge(sugg.questionA.id, sugg.questionB.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve & Merge (Keep Question A)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveMerge(sugg.questionB.id, sugg.questionA.id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg transition-colors"
                  >
                    <span>Approve & Merge (Keep Question B)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MANUAL MERGE TOOL */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Manual Question Merge</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            If you identify two questions that refer to the same concept but weren't automatically grouped, merge them here manually.
          </p>
        </div>

        <form onSubmit={handleManualMergeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Canonical Question (Will be retained)
            </label>
            <select
              value={manualTargetId}
              onChange={(e) => setManualTargetId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- Choose Target Question --</option>
              {allQuestions.map(q => (
                <option key={q.id} value={q.id}>
                  [{q.module?.moduleName}] {q.canonicalQuestionText.substring(0, 75)}... ({q.occurrences?.length || 0} papers)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Source Question to Merge (Occurrences moved to Target)
            </label>
            <select
              value={manualSourceId}
              onChange={(e) => setManualSourceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- Choose Source Question --</option>
              {allQuestions.filter(q => q.id !== manualTargetId).map(q => (
                <option key={q.id} value={q.id}>
                  [{q.module?.moduleName}] {q.canonicalQuestionText.substring(0, 75)}... ({q.occurrences?.length || 0} papers)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isMergingManual || !manualTargetId || !manualSourceId}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <GitMerge className="w-4 h-4" />
              <span>{isMergingManual ? 'Merging...' : 'Merge Selected Questions'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEPARATE / UNMERGE OCCURRENCES SECTION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <Split className="w-5 h-5 text-teal-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Separate Previously Merged Questions
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            You can undo merges at any time. Split individual occurrences back into their own distinct standalone questions.
          </p>
        </div>

        {multiOccQuestions.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No merged or multi-paper questions currently present in this subject.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {multiOccQuestions.map(q => (
              <div key={q.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{q.canonicalQuestionText}</span>
                  <span className="font-mono text-3xs bg-teal-100 text-teal-900 px-2 py-0.5 rounded">
                    {q.occurrences.length} occurrences
                  </span>
                </div>

                <div className="space-y-1.5 pl-3 border-l-2 border-teal-500">
                  {q.occurrences.map(occ => (
                    <div
                      key={occ.id}
                      className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-700">
                          {occ.paper?.paperName} {occ.paper?.year ? `(${occ.paper.year})` : ''}:
                        </span>
                        <span className="text-slate-500 italic ml-1">
                          "{occ.originalQuestionText}"
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnmergeOccurrence(occ.id)}
                        className="px-2 py-1 text-2xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded shrink-0 ml-2"
                        title="Detach into its own standalone question"
                      >
                        Separate Out
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
