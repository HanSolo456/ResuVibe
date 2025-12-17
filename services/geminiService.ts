import { ResumeAnalysis } from "../types";

const BASE_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/analyze$/, '')
  : 'http://localhost:3000';
const ANALYZE_URL = `${BASE_URL}/analyze`;
const UPLOAD_ANALYZE_URL = `${BASE_URL}/upload-analyze`;

export const analyzeResume = async (text: string): Promise<ResumeAnalysis> => {
  if (!text || text.trim().length < 50) {
    throw new Error("Please enter enough text to analyze (at least 50 characters).");
  }

  try {
    const response = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText: text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    
    // Ensure the data matches our expected type
    return data as ResumeAnalysis;
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error.message || "Failed to analyze resume. Ensure the server is running.");
  }
};

export const analyzeResumeFile = async (file: File): Promise<ResumeAnalysis> => {
  if (!file) throw new Error('No file provided.');
  const form = new FormData();
  form.append('file', file);
  try {
    const response = await fetch(UPLOAD_ANALYZE_URL, {
      method: 'POST',
      body: form,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    const data = await response.json();
    return data as ResumeAnalysis;
  } catch (error: any) {
    console.error('Upload API Error:', error);
    throw new Error(error.message || 'Failed to analyze uploaded file.');
  }
}