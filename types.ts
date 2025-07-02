export enum AppState {
  IDLE,
  PROCESSING_PDF,
  VALIDATING_LIMITS,
  GENERATING_QUIZ,
  QUIZ,
  QUIZ_ENDED,
  ERROR,
}

export interface Quiz {
  question: string;
  options: string[];
  answer: string;
}

export interface Score {
  correct: number;
  total: number;
}

export interface ProcessedPdf {
  name: string;
  text: string;
  charCount: number;
}

export interface IncorrectAnswer {
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation?: string;
}