import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit3,
  Layers,
  ArrowRight,
  GitMerge,
  HelpCircle,
  PlusCircle
} from 'lucide-react';
import { Paper, Module, ExtractedQuestionItem } from '../types';
import { api } from '../services/api';

interface ExtractionReviewModalProps {
  isOpen: boolean;
  paper: Paper | null;
  modules: Module[];
  onClose: () => void;
  onSaved: () => void;
}

export const ExtractionReviewModal: React.FC<ExtractionReviewModalProps> = ({
  isOpen,
  paper,
  modules,
  onClose,
  onSaved
}) => {
  const [items, setItems] = useState<ExtractedQuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load questions parsed from paper
  useEffect(() => {
    if (isOpen && paper) {
      loadPaperQuestions();
    }
  }, [isOpen, paper]);

  const loadPaperQuestions = async () => {
    if (!paper) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getPaperExtractedText(paper.id);
      const rawQs = data.extractedQuestions || [];

      // Check similarity for each extracted question
      const mappedItems: ExtractedQuestionItem[] = [];

      for (let i = 0; i < rawQs.length; i++) {
        const qText = rawQs[i];
        const defaultModId = modules[0]?.id || '';

        // Query local similarity against existing questions
        let suggestedMatch = undefined;
        try {
          const simRes = await api.checkSimilarity(qText, paper.subjectId);
          if (simRes.bestMatch && simRes.bestMatch.similarity >= 55) {
            suggestedMatch = {
              questionId: simRes.bestMatch.questionId,
              canonicalQuestionText: simRes.bestMatch.canonicalQuestionText,
              similarity: simRes.bestMatch.similarity,
              explanation: simRes.bestMatch.explanation
            };
          }
        } catch (e) {
          // Similarity check silent fallback
        }

        mappedItems.push({
          id: `item_${i}_${Date.now()}`,
          originalText: qText,
          cleanedText: qText,
          pageNumber: 1,
          selectedModuleId: suggestedMatch ? undefined : defaultModId,
          suggestedMatch,
          selectedMatchId: suggestedMatch?.questionId // default to suggested match if available!
        });
      }

      setItems(mappedItems);
    } catch (err: any) {
      setError(err.message || 'Failed to parse questions from paper');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !paper) return null;

  const handleUpdateText = (id: string, newText: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, cleanedText: newText } : item));
  };

  const handleUpdateModule = (id: string, modId: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, selectedModuleId: modId } : item));
  };

  const handleToggleMatchMode = (id: string, matchId?: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        selectedMatchId: matchId,
        selectedModuleId: matchId ? undefined : (item.selectedModuleId || modules[0]?.id)
      };
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddNewItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        originalText: '',
        cleanedText: '',
        pageNumber: 1,
        selectedModuleId: modules[0]?.id || ''
      }
    ]);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payloadItems = items
        .filter(item => item.cleanedText.trim().length > 0)
        .map(item => ({
          canonicalQuestionText: item.cleanedText.trim(),
          originalQuestionText: item.originalText.trim() || item.cleanedText.trim(),
          moduleId: item.selectedModuleId || modules[0]?.id,
          existingQuestionId: item.selectedMatchId || undefined,
          pageNumber: item.pageNumber
        }));

      if (payloadItems.length === 0) {
        setError('No valid questions to save');
        setIsSaving(false);
        return;
      }

      await api.batchAddExtractedQuestions(paper.id, payloadItems);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save extracted questions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-800">
                Review & Confirm Extracted Questions
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source Paper: <strong className="text-slate-700">{paper.paperName} ({paper.year || 'N/A'})</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="bg-teal-50 px-6 py-2.5 border-b border-teal-100 text-xs text-teal-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Review each extracted question. Assign to a module, or approve suggested matches with existing questions. You maintain 100% control over question deduplication.
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddNewItem}
            className="inline-flex items-center space-x-1 font-semibold text-teal-700 hover:text-teal-900 shrink-0 ml-3"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs font-medium">Extracting and checking similarity against existing questions...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No questions found or extracted from this paper. You can add one manually using the button above.
            </div>
          ) : (
            items.map((item, index) => {
              const hasSuggestedMatch = Boolean(item.suggestedMatch);
              const isLinkedToMatch = Boolean(item.selectedMatchId);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isLinkedToMatch
                      ? 'border-teal-200 bg-teal-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Q{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Discard this question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question editable input */}
                  <textarea
                    rows={2}
                    value={item.cleanedText}
                    onChange={(e) => handleUpdateText(item.id, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter or refine question text..."
                  />

                  {/* Similarity Match Banner if detected */}
                  {hasSuggestedMatch && item.suggestedMatch && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-teal-50/80 border border-teal-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-2">
                        <GitMerge className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-teal-900">
                              Suggested Match ({item.suggestedMatch.similarity}%)
                            </span>
                            <span className="text-3xs bg-teal-200/60 text-teal-900 px-1.5 py-0.2 rounded font-mono">
                              Similarity
                            </span>
                          </div>
                          <p className="text-teal-800 font-normal italic mt-0.5">
                            "{item.suggestedMatch.canonicalQuestionText}"
                          </p>
                          <span className="text-3xs text-teal-600 block mt-0.5">
                            {item.suggestedMatch.explanation}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMatchMode(item.id, item.suggestedMatch?.questionId)}
                          className={`px-2.5 py-1 text-2xs font-bold rounded transition-colors ${
                            isLinkedToMatch
                              ? 'bg-teal-700 text-white shadow-2xs'
                              : 'bg-white text-teal-800 border border-teal-300 hover:bg-teal-100'
                          }`}
                        >
                          {isLinkedToMatch ? '✓ Linked to Match' : 'Link to Match'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMatchMode(item.id, undefined)}
                          className={`px-2.5 py-1 text-2xs font-medium rounded transition-colors ${
                            !isLinkedToMatch
                              ? 'bg-slate-700 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Keep as New
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Module Assignment selector (if not linked to match) */}
                  {!isLinkedToMatch && (
                    <div className="mt-3 flex items-center space-x-3 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-600">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">Assign Module:</span>
                      </div>
                      <select
                        value={item.selectedModuleId || ''}
                        onChange={(e) => handleUpdateModule(item.id, e.target.value)}
                        className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        {modules.map(mod => (
                          <option key={mod.id} value={mod.id}>
                            {mod.moduleName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {items.length} question(s) ready to be registered into the database
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || items.length === 0}
              onClick={handleSaveAll}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving Questions...' : 'Save & Update Frequencies'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
