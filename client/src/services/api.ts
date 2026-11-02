import {
  SubjectSummary,
  Paper,
  Module,
  Question,
  FrequencyReportData,
  SimilaritySuggestion
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const api = {
  // Subjects
  async getSubjects(): Promise<SubjectSummary[]> {
    const res = await fetch(`${API_BASE}/subjects`);
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async getSubject(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/subjects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch subject details');
    return res.json();
  },

  async createSubject(data: { name: string; subjectCode?: string; description?: string; initialModules?: string[] }): Promise<any> {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create subject');
    }
    return res.json();
  },

  async updateSubject(id: string, data: { name?: string; subjectCode?: string; description?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update subject');
    return res.json();
  },

  async deleteSubject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete subject');
  },

  // Frequency Report
  async getFrequencyReport(subjectId: string): Promise<FrequencyReportData> {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/report`);
    if (!res.ok) throw new Error('Failed to fetch frequency report');
    return res.json();
  },

  // Similarity Suggestions
  async getSimilaritySuggestions(subjectId: string): Promise<SimilaritySuggestion[]> {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/similarity-suggestions`);
    if (!res.ok) throw new Error('Failed to fetch similarity suggestions');
    return res.json();
  },

  // Modules
  async createModule(subjectId: string, data: { moduleName: string; order?: number }): Promise<Module> {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create module');
    return res.json();
  },

  async updateModule(moduleId: string, data: { moduleName?: string; order?: number }): Promise<Module> {
    const res = await fetch(`${API_BASE}/modules/${moduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update module');
    return res.json();
  },

  async deleteModule(moduleId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/modules/${moduleId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete module');
  },

  async reorderModules(subjectId: string, orders: Array<{ id: string; order: number }>): Promise<Module[]> {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/modules/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders })
    });
    if (!res.ok) throw new Error('Failed to reorder modules');
    return res.json();
  },

  // Papers
  async uploadPapers(subjectId: string, formData: FormData): Promise<any[]> {
    const res = await fetch(`${API_BASE}/subjects/${subjectId}/papers/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload papers');
    }
    return res.json();
  },

  async getPaperExtractedText(paperId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/extracted-text`);
    if (!res.ok) throw new Error('Failed to fetch paper text');
    return res.json();
  },

  async updatePaper(paperId: string, data: { paperName?: string; year?: string }): Promise<Paper> {
    const res = await fetch(`${API_BASE}/papers/${paperId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update paper');
    return res.json();
  },

  async deletePaper(paperId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/papers/${paperId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete paper');
  },

  async reExtractPaper(paperId: string, forceOcr = false): Promise<any> {
    const res = await fetch(`${API_BASE}/papers/${paperId}/re-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceOcr })
    });
    if (!res.ok) throw new Error('Failed to re-extract paper');
    return res.json();
  },

  // Questions
  async createQuestionManual(data: {
    canonicalQuestionText: string;
    moduleId: string;
    paperIds: string[];
    marks?: string;
  }): Promise<Question> {
    const res = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create question');
    }
    return res.json();
  },

  async batchAddExtractedQuestions(paperId: string, items: Array<{
    canonicalQuestionText: string;
    originalQuestionText: string;
    moduleId: string;
    existingQuestionId?: string;
    marks?: string;
    pageNumber?: number;
  }>): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/batch-from-extraction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId, items })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to batch add questions');
    }
    return res.json();
  },

  async checkSimilarity(text: string, subjectId: string, moduleId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/similarity-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, subjectId, moduleId })
    });
    if (!res.ok) throw new Error('Failed to check similarity');
    return res.json();
  },

  async mergeQuestions(targetQuestionId: string, sourceQuestionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetQuestionId, sourceQuestionId })
    });
    if (!res.ok) throw new Error('Failed to merge questions');
    return res.json();
  },

  async unmergeQuestion(occurrenceId: string, newModuleId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/unmerge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrenceId, newModuleId })
    });
    if (!res.ok) throw new Error('Failed to unmerge question');
    return res.json();
  },

  async updateQuestion(id: string, data: { canonicalQuestionText?: string; moduleId?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update question');
    return res.json();
  },

  async deleteQuestion(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete question');
  },

  // Seed / Demo
  async seedDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/seed/demo`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo data');
    return res.json();
  },

  async resetDatabase(): Promise<any> {
    const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  }
};
