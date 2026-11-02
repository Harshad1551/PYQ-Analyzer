export interface SubjectSummary {
  id: string;
  name: string;
  subjectCode: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  totalPapers: number;
  totalModules: number;
  totalQuestions: number;
  topRepeatedQuestion: {
    text: string;
    count: number;
    percentage: number;
  } | null;
}

export interface Paper {
  id: string;
  subjectId: string;
  paperName: string;
  year: string | null;
  uploadedFilePath: string;
  extractionStatus: string;
  rawExtractedText: string | null;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  occurrences?: QuestionOccurrence[];
}

export interface Module {
  id: string;
  subjectId: string;
  moduleName: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  questions?: Question[];
}

export interface QuestionOccurrence {
  id: string;
  questionId: string;
  paperId: string;
  originalQuestionText: string;
  sourcePageNumber: number | null;
  marks: string | null;
  createdAt?: string;
  paper?: {
    id: string;
    paperName: string;
    year: string | null;
  };
}

export interface Question {
  id: string;
  moduleId: string;
  canonicalQuestionText: string;
  isManual?: boolean;
  createdAt?: string;
  updatedAt?: string;
  module?: Module;
  occurrences: QuestionOccurrence[];
}

export interface ReportOccurrence {
  id: string;
  paperId: string;
  paperName: string;
  paperYear: string | null;
  originalQuestionText: string;
  sourcePageNumber: number | null;
  marks: string | null;
}

export interface ReportQuestion {
  id: string;
  canonicalQuestionText: string;
  isManual?: boolean;
  marks?: string | null;
  repetitionCount: number;
  totalAvailablePapers: number;
  repetitionFraction: string;
  repetitionPercentage: number;
  occurrences: ReportOccurrence[];
}

export interface ReportModule {
  id: string;
  moduleName: string;
  order: number;
  questionCount: number;
  questions: ReportQuestion[];
}

export interface FrequencyReportData {
  subject: {
    id: string;
    name: string;
    subjectCode: string | null;
    description: string | null;
  };
  totalAvailablePapers: number;
  papers: Array<{
    id: string;
    paperName: string;
    year: string | null;
  }>;
  summary: {
    totalModules: number;
    totalQuestions: number;
    highFrequencyQuestions: number;
    singleAppearanceQuestions: number;
  };
  modules: ReportModule[];
}

export interface SimilaritySuggestion {
  questionA: {
    id: string;
    text: string;
    moduleId: string;
    moduleName: string;
    occurrencesCount: number;
    papers: string[];
  };
  questionB: {
    id: string;
    text: string;
    moduleId: string;
    moduleName: string;
    occurrencesCount: number;
    papers: string[];
  };
  similarity: number;
  isHighConfidence: boolean;
  commonTerms: string[];
  explanation: string;
}

export interface ExtractedQuestionItem {
  id: string;
  originalText: string;
  cleanedText: string;
  pageNumber: number;
  marks?: string;
  selectedModuleId?: string;
  selectedMatchId?: string;
  suggestedMatch?: {
    questionId: string;
    canonicalQuestionText: string;
    similarity: number;
    explanation: string;
  };
}
