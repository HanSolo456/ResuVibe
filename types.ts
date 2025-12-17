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
