import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Edit2,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  FileSearch
} from 'lucide-react';
import { Paper } from '../types';
import { api } from '../services/api';

interface PapersManagerProps {
  subjectId: string;
  papers: Paper[];
  totalAvailablePapers: number;
  onRefresh: () => void;
  onOpenExtractionReview: (paper: Paper) => void;
}

export const PapersManager: React.FC<PapersManagerProps> = ({
  subjectId,
  papers,
  totalAvailablePapers,
  onRefresh,
  onOpenExtractionReview
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileMetadata, setFileMetadata] = useState<Array<{ paperName: string; year: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [rawTextModal, setRawTextModal] = useState<{ isOpen: boolean; paperName: string; text: string } | null>(null);
  const [editingPaper, setEditingPaper] = useState<{ id: string; paperName: string; year: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);

      // Auto-populate default paper names and years
      const metas = filesArray.map(f => {
        const base = f.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
        const yearMatch = f.name.match(/\b(20\d\d|19\d\d)\b/);
        return {
          paperName: base,
          year: yearMatch ? yearMatch[1] : ''
        };
      });
      setFileMetadata(metas);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setActionError(null);
    setUploadProgressMsg('Uploading PDF papers and extracting questions...');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('metadata', JSON.stringify(fileMetadata));

      const uploadedResults = await api.uploadPapers(subjectId, formData);
      setSelectedFiles([]);
      setFileMetadata([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onRefresh();

      // If exactly one paper was uploaded with extracted questions, prompt review
      if (uploadedResults.length === 1 && uploadedResults[0].questions && uploadedResults[0].questions.length > 0) {
        onOpenExtractionReview(uploadedResults[0]);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to upload papers');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  const handleDeletePaper = async (paperId: string, paperName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${paperName}"? This will automatically recalculate all question repetition counts.`)) {
      return;
    }
    try {
      await api.deletePaper(paperId);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete paper');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPaper) return;
    try {
      await api.updatePaper(editingPaper.id, {
        paperName: editingPaper.paperName,
        year: editingPaper.year
      });
      setEditingPaper(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update paper');
    }
  };

  const handleViewRawText = async (paperId: string, paperName: string) => {
    try {
      const data = await api.getPaperExtractedText(paperId);
      setRawTextModal({
        isOpen: true,
        paperName,
        text: data.rawText || 'No text extracted yet.'
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch paper text');
    }
  };

  const handleReExtract = async (paperId: string, forceOcr = false) => {
    try {
      setUploadProgressMsg(forceOcr ? 'Running Tesseract OCR on scanned document...' : 'Re-extracting text...');
      setIsUploading(true);
      await api.reExtractPaper(paperId, forceOcr);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to re-extract paper');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Previous-Year Question Papers (PYQs)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Support both selectable text PDFs and scanned PDFs (OCR enabled). Every PDF registers as one distinct examination paper.
            </p>
          </div>
          <div className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg text-right">
            <span className="text-xs text-teal-700 block font-medium">Available Papers</span>
            <span className="text-xl font-extrabold text-teal-800">{totalAvailablePapers}</span>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-teal-500 hover:bg-teal-50/20 transition-all cursor-pointer">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload-input"
            />
            <label htmlFor="pdf-upload-input" className="cursor-pointer block">
              <Upload className="w-10 h-10 text-teal-600 mx-auto mb-2" />
              <span className="text-sm font-semibold text-slate-700 block">
                Click to browse or drag & drop PDF files
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                Upload one or multiple examination papers (.pdf up to 30MB)
              </span>
            </label>
          </div>

          {/* Staged files metadata configuration */}
          {selectedFiles.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Staged Papers ({selectedFiles.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs">
                    <div className="truncate text-slate-700 font-medium">
                      {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Paper Name / Session"
                        value={fileMetadata[idx]?.paperName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFileMetadata(prev => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], paperName: val };
                            return copy;
                          });
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Exam Year (e.g. 2022)"
                        value={fileMetadata[idx]?.year || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFileMetadata(prev => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], year: val };
                            return copy;
                          });
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles([]);
                    setFileMetadata([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600 font-medium"
                >
                  Clear Selection
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isUploading ? uploadProgressMsg || 'Uploading...' : `Upload & Process ${selectedFiles.length} Paper(s)`}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Uploaded Papers List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">
              Registered Examination Papers ({papers.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Total Available Papers in Frequency Calculation: <strong className="text-teal-700 font-bold">{totalAvailablePapers}</strong>
          </span>
        </div>

        {papers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileSearch className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No PYQ papers uploaded for this subject yet.</p>
            <p className="text-xs text-slate-400 mt-1">Upload PDF question papers above or click "Load Sample" in the header.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Paper Name</th>
                  <th className="py-3 px-4 w-24 text-center">Year</th>
                  <th className="py-3 px-4 w-28 text-center">Pages</th>
                  <th className="py-3 px-4 w-32 text-center">Status</th>
                  <th className="py-3 px-4 w-40 text-center">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {papers.map((paper, index) => {
                  const isEditing = editingPaper?.id === paper.id;

                  return (
                    <tr key={paper.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* Paper Name */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingPaper.paperName}
                            onChange={(e) => setEditingPaper({ ...editingPaper, paperName: e.target.value })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs w-full focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          />
                        ) : (
                          <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                            <span>{paper.paperName}</span>
                          </div>
                        )}
                      </td>

                      {/* Year */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingPaper.year}
                            onChange={(e) => setEditingPaper({ ...editingPaper, year: e.target.value })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs w-20 text-center focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-2xs font-semibold">
                            {paper.year || 'N/A'}
                          </span>
                        )}
                      </td>

                      {/* Pages */}
                      <td className="py-3 px-4 text-center text-slate-600">
                        {paper.pageCount} page(s)
                      </td>

                      {/* Extraction Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          <span>{paper.extractionStatus}</span>
                        </span>
                      </td>

                      {/* Uploaded date */}
                      <td className="py-3 px-4 text-center text-slate-400 text-2xs">
                        {new Date(paper.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="px-2.5 py-1 bg-teal-600 text-white rounded text-2xs font-medium hover:bg-teal-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPaper(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-2xs hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onOpenExtractionReview(paper)}
                                title="Extract / Review questions from this paper"
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded hover:bg-teal-100 font-medium transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-teal-600" />
                                <span>Review & Extract</span>
                              </button>

                              <button
                                onClick={() => handleViewRawText(paper.id, paper.paperName)}
                                title="View extracted raw text"
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEditingPaper({ id: paper.id, paperName: paper.paperName, year: paper.year || '' })}
                                title="Rename paper / year"
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleReExtract(paper.id, true)}
                                title="Force OCR Re-extraction"
                                className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeletePaper(paper.id, paper.paperName)}
                                title="Delete paper"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Extracted Text Modal */}
      {rawTextModal?.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900">Extracted Text Preview</h4>
                <p className="text-xs text-slate-500">{rawTextModal.paperName}</p>
              </div>
              <button
                onClick={() => setRawTextModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-700 bg-slate-50/70 whitespace-pre-wrap leading-relaxed select-text">
              {rawTextModal.text}
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setRawTextModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
