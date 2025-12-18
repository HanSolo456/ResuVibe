export interface ResumeAnalysis {
  name?: string;
  score: number;
  label: string;
  description: string;
  recruiterSnapshot: string;
  roasts: string[];
  improvements: string[];
  overview?: string;
  sections?: {
    header?: SectionFeedback;
    summary?: SectionFeedback;
    experience?: SectionFeedback;
    projects?: SectionFeedback;
    education?: SectionFeedback;
    skills?: SectionFeedback;
    certifications?: SectionFeedback;
  };
  sourceText?: string;
  missingKeywords?: string[];
  greenFlags?: string[];
  redFlags?: string[];
  interviewQuestions?: {
    question: string;
    hint: string;
  }[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface SectionFeedback {
  issues: string[];
  suggested: string[];
}
