import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { Module } from '../types';
import { api } from '../services/api';

interface ModulesManagerProps {
  subjectId: string;
  modules: Module[];
  onRefresh: () => void;
}

export const ModulesManager: React.FC<ModulesManagerProps> = ({
  subjectId,
  modules,
  onRefresh
}) => {
  const [newModuleName, setNewModuleName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    setError(null);
    setIsAdding(true);
    try {
      await api.createModule(subjectId, {
        moduleName: newModuleName.trim(),
        order: modules.length + 1
      });
      setNewModuleName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add module');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (moduleId: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await api.updateModule(moduleId, { moduleName: editingName.trim() });
      setEditingId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update module name');
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${moduleName}"? All questions in this module will also be deleted.`)) {
      return;
    }
    setError(null);
    try {
      await api.deleteModule(moduleId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete module');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...modules];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((m, idx) => ({ id: m.id, order: idx + 1 }));

    try {
      await api.reorderModules(subjectId, payload);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reorder modules');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Module Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">Module Management</h3>
        <p className="text-xs text-slate-500 mb-4">
          Organize exam questions under curriculum modules or units. Every question must be associated with a module.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAddModule} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Module 6: Real-time Analytics & Kafka"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isAdding || !newModuleName.trim()}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Module</span>
          </button>
        </form>
      </div>

      {/* Modules List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h4 className="text-sm font-bold text-slate-800">
              Curriculum Modules ({modules.length})
            </h4>
          </div>
          <span className="text-xs text-slate-400">Drag or use arrows to change display order</span>
        </div>

        <div className="divide-y divide-slate-100">
          {modules.map((mod, index) => {
            const isEditing = editingId === mod.id;
            const qCount = mod.questions?.length || 0;

            return (
              <div
                key={mod.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 mr-4">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  {isEditing ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs border border-teal-500 rounded focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(mod.id)}
                        className="p-1 bg-teal-600 text-white rounded hover:bg-teal-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-semibold text-slate-800 block">
                        {mod.moduleName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {qCount} question{qCount === 1 ? '' : 's'} assigned
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions & reorder buttons */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    title="Move up"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === modules.length - 1}
                    title="Move down"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-px bg-slate-200 mx-1" />

                  <button
                    onClick={() => {
                      setEditingId(mod.id);
                      setEditingName(mod.moduleName);
                    }}
                    title="Edit module name"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteModule(mod.id, mod.moduleName)}
                    title="Delete module"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
