import React, { useState } from 'react';
import { X, BookOpen, Layers } from 'lucide-react';

interface NewSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; subjectCode?: string; description?: string; initialModules?: string[] }) => Promise<void>;
}

export const NewSubjectModal: React.FC<NewSubjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [moduleCount, setModuleCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a subject name');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const initialModules = Array.from({ length: moduleCount }, (_, i) => `Module ${i + 1}`);
      await onSubmit({
        name: name.trim(),
        subjectCode: subjectCode.trim() || undefined,
        description: description.trim() || undefined,
        initialModules
      });
      setName('');
      setSubjectCode('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-800">Add New Subject</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Big Data Analytics, Deep Learning, Computer Networks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subject Code <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 18CS81, CS801"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Initial Modules
              </label>
              <select
                value={moduleCount}
                onChange={(e) => setModuleCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
              >
                <option value={3}>3 Modules</option>
                <option value={4}>4 Modules</option>
                <option value={5}>5 Modules (Standard)</option>
                <option value={6}>6 Modules</option>
                <option value={8}>8 Modules</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description / Notes <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Semester 8 VTU syllabus previous year question papers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
