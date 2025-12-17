import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(messages, responseFormat = { type: 'json_object' }) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      response_format: responseFormat
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error ${response.status}: ${err}`);
  }

  const payload = await response.json();
  let text = payload?.choices?.[0]?.message?.content || '';
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  text = text.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      let cleaned = match[0].replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
      data = JSON.parse(cleaned);
    } else {
      throw new Error(`Invalid JSON from model: ${text}`);
    }
  }
  return data;
}

// POST /analyze - The main endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ 
        error: "Resume text is too short. Please provide at least 50 characters." 
      });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Server misconfiguration: missing GROQ_API_KEY."
      });
    }

    const messages = [
      {
        role: 'system',
        content: `You are "ResuVibe Recruiter AI" — a Gen-Z technical recruiter who screens resumes in under 10 seconds. Your job: Analyze how this resume FEELS to a recruiter, not just what it says.

CRITICAL OUTPUT RULES: Output ONLY valid JSON. ALL content MUST be on ONE SINGLE LINE. NO newlines, NO markdown, NO explanations. The JSON must be directly parsable.

NAME EXTRACTION (MANDATORY): Extract the candidate's full name from the FIRST visible line or header. Look for patterns like "Name:", email headers, or a standalone name at the top. If absolutely no name is detectable, use "Unknown".

SCORING (0–100 INTEGER): Keep scores within ±5 points for the same resume. Base score on: Signal & relevance (30%), Proof of impact / metrics (25%), Clarity & scan-ability (20%), Technical fundamentals (15%), Polish & focus (10%).

VIBE LABEL (choose ONE based on ACTUAL RESUME CONTENT): "Corporate-Heavy" = Formal tone, enterprise tech. "Startup-Ready" = Modern stack, side projects with REAL metrics. "Academic-Focused" = Research papers, publications, thesis work. "Resume-Padding Energy" = TONS of buzzwords but zero proof. "Generic Template Syndrome" = Cookie-cutter language. "Balanced & Recruiter-Friendly" = Clear structure, good mix of technical depth AND business impact.

RECRUITER SNAPSHOT: Write ONE sharp sentence that sounds like a real recruiter thinking silently after a quick scan.

DESCRIPTION: Write a concise 1–2 sentence explanation of the overall resume vibe. No fluff. No praise without evidence.

OVERVIEW: Write ONE sentence summarizing the candidate's background.

ROASTS (EXACTLY 4): Write SAVAGE CONVERSATIONAL ONE-LINERS that are FUNNY and CUTTING. Use questions, comparisons, pop culture refs, Gen-Z slang. NEVER write boring bullet points like "No metrics to back up claims". BAD: ❌ "Lack of ownership in project descriptions" GOOD: ✅ "Built an Amazon clone? Join the club of 50,000 tutorial followers"

IMPROVEMENTS (EXACTLY 3): Actionable steps. Achievable for a student. No fake experience suggestions.

SECTIONS - CRITICAL RULES FOR SUGGESTED REWRITES:
For each section (summary, experience, projects, education, skills, certifications), provide:
- issues: 2-3 specific critiques of what's wrong
- suggested: 2-4 IMPROVED REWRITES of the ACTUAL content from the resume

⚠️ CRITICAL FOR "suggested" FIELD - YOU MUST:
1. PRESERVE ALL ORIGINAL DETAILS: company names, job titles, dates, project names, technologies, links, school names, certificate names
2. NEVER invent fake metrics or percentages that aren't in the original
3. NEVER remove specific details to make generic statements
4. KEEP the original structure but improve the WORDING and ACTION VERBS
5. Add impact language WITHOUT making up numbers (use phrases like "resulting in improved performance" instead of fake "~30% improvement")

EXAMPLE - BAD vs GOOD suggested rewrites:

ORIGINAL: "Web Development Intern | Prodigy InfoTech Aug 2024 – Sept 2024. Supported the development and maintenance of responsive websites, utilized HTML, CSS, and JavaScript"

❌ BAD (removes all details): "Improved website responsiveness by ~25% as a web development intern"

✅ GOOD (keeps details, improves wording): "Web Development Intern | Prodigy InfoTech (Aug–Sept 2024): Engineered responsive web interfaces using HTML, CSS, and JavaScript; collaborated with design team to optimize user experience and resolve cross-browser compatibility issues"

JSON FORMAT (EXACT KEYS):
{"name": string, "score": number (0-100 integer), "label": string, "description": string, "recruiterSnapshot": string, "overview": string, "sections": {"summary": {"issues": string[], "suggested": string[]}, "experience": {"issues": string[], "suggested": string[]}, "projects": {"issues": string[], "suggested": string[]}, "education": {"issues": string[], "suggested": string[]}, "skills": {"issues": string[], "suggested": string[]}, "certifications": {"issues": string[], "suggested": string[]}}, "roasts": [string, string, string, string], "improvements": [string, string, string]}`
      },
      {
        role: 'user',
        content: `Resume Text:\n${resumeText}`
      }
    ];

    const data = await callGroq(messages);
    res.json({ ...data, sourceText: resumeText });

  } catch (error) {
    console.error("Analysis Error:", error);
    
    // Fallback response so frontend doesn't crash
    res.status(500).json({
      score: 0,
      label: "Server Error",
      description: "The AI is currently overwhelmed or unreachable.",
      recruiterSnapshot: "I can't even read this right now.",
      roasts: ["Server connection failed", "Try again later", "Check your internet"],
      improvements: ["Refresh the page", "Check API status", "Contact support"]
    });
  }
});

// POST /upload-analyze - File upload + section-wise analysis
app.post('/upload-analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration: missing GROQ_API_KEY.' });
    }

    const { mimetype, buffer, originalname } = req.file;
    let extractedText = '';

    if (mimetype.includes('pdf')) {
      const result = await pdfParse(buffer);
      extractedText = (result.text || '').trim();
    } else if (
      mimetype.includes('officedocument.wordprocessingml.document') ||
      originalname.toLowerCase().endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = (result.value || '').trim();
    } else if (mimetype.startsWith('text/') || originalname.toLowerCase().endsWith('.txt')) {
      extractedText = buffer.toString('utf8').trim();
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' });
    }

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from the file.' });
    }

    const sectionPrompt = [
      {
        role: 'system',
        content: `You are "ResuVibe Recruiter AI" — a Gen-Z technical recruiter who screens resumes in under 10 seconds. Your job: Analyze how this resume FEELS to a recruiter, not just what it says.

CRITICAL OUTPUT RULES: Output ONLY valid JSON. ALL content MUST be on ONE SINGLE LINE. NO newlines, NO markdown, NO explanations. The JSON must be directly parsable.

NAME EXTRACTION (MANDATORY): Extract the candidate's full name from the FIRST visible line or header. Look for patterns like "Name:", email headers, or a standalone name at the top. If absolutely no name is detectable, use "Unknown".

SCORING (0–100 INTEGER): Keep scores within ±5 points for the same resume. Base score on: Signal & relevance (30%), Proof of impact / metrics (25%), Clarity & scan-ability (20%), Technical fundamentals (15%), Polish & focus (10%).

VIBE LABEL (choose ONE based on ACTUAL RESUME CONTENT): "Corporate-Heavy" = Formal tone, enterprise tech. "Startup-Ready" = Modern stack, side projects with REAL metrics. "Academic-Focused" = Research papers, publications, thesis work. "Resume-Padding Energy" = TONS of buzzwords but zero proof. "Generic Template Syndrome" = Cookie-cutter language. "Balanced & Recruiter-Friendly" = Clear structure, good mix of technical depth AND business impact.

RECRUITER SNAPSHOT: Write ONE sharp sentence that sounds like a real recruiter thinking silently after a quick scan.

DESCRIPTION: Write a concise 1–2 sentence explanation of the overall resume vibe. No fluff. No praise without evidence.

OVERVIEW: Write ONE sentence summarizing the candidate's background.

ROASTS (EXACTLY 4): Write SAVAGE CONVERSATIONAL ONE-LINERS that are FUNNY and CUTTING. Use questions, comparisons, pop culture refs, Gen-Z slang. NEVER write boring bullet points like "No metrics to back up claims". BAD: ❌ "Lack of ownership in project descriptions" GOOD: ✅ "Built an Amazon clone? Join the club of 50,000 tutorial followers"

IMPROVEMENTS (EXACTLY 3): Actionable steps. Achievable for a student. No fake experience suggestions.

SECTIONS - CRITICAL RULES FOR SUGGESTED REWRITES:
For each section (summary, experience, projects, education, skills, certifications), provide:
- issues: 2-3 specific critiques of what's wrong
- suggested: 2-4 IMPROVED REWRITES of the ACTUAL content from the resume

⚠️ CRITICAL FOR "suggested" FIELD - YOU MUST:
1. PRESERVE ALL ORIGINAL DETAILS: company names, job titles, dates, project names, technologies, links, school names, certificate names
2. NEVER invent fake metrics or percentages that aren't in the original
3. NEVER remove specific details to make generic statements
4. KEEP the original structure but improve the WORDING and ACTION VERBS
5. Add impact language WITHOUT making up numbers (use phrases like "resulting in improved performance" instead of fake "~30% improvement")

EXAMPLE - BAD vs GOOD suggested rewrites:

ORIGINAL: "Web Development Intern | Prodigy InfoTech Aug 2024 – Sept 2024. Supported the development and maintenance of responsive websites, utilized HTML, CSS, and JavaScript"

❌ BAD (removes all details): "Improved website responsiveness by ~25% as a web development intern"

✅ GOOD (keeps details, improves wording): "Web Development Intern | Prodigy InfoTech (Aug–Sept 2024): Engineered responsive web interfaces using HTML, CSS, and JavaScript; collaborated with design team to optimize user experience and resolve cross-browser compatibility issues"

ORIGINAL: "Drawing-Board OpenCV using Python. Technologies: OpenCV, Numpy. Real-time computer vision operations."

❌ BAD (loses project details): "Developed a real-time computer vision application with ~20% improvement in FPS"

✅ GOOD (keeps project, improves description): "Drawing-Board OpenCV: Built real-time hand-tracking drawing application using Python, OpenCV, NumPy, and MediaPipe; implemented FPS optimization and gesture-based controls for seamless user interaction"

ORIGINAL: "Presidency College, Bengaluru - Bachelor of Computer Applications Jul 2023 – June 2026"

❌ BAD (invents GPA): "Completed coursework with ~3.5 GPA"

✅ GOOD (keeps real info): "Bachelor of Computer Applications | Presidency College, Bengaluru (Expected June 2026): Specializing in Data Structures, Algorithms, and Full-Stack Development"

JSON FORMAT (EXACT KEYS):
{"name": string, "score": number (0-100 integer), "label": string, "description": string, "recruiterSnapshot": string, "overview": string, "sections": {"summary": {"issues": string[], "suggested": string[]}, "experience": {"issues": string[], "suggested": string[]}, "projects": {"issues": string[], "suggested": string[]}, "education": {"issues": string[], "suggested": string[]}, "skills": {"issues": string[], "suggested": string[]}, "certifications": {"issues": string[], "suggested": string[]}}, "roasts": [string, string, string, string], "improvements": [string, string, string]}`
      },
      {
        role: 'user',
        content: `Resume Text:\n${extractedText}`
      }
    ];

    const data = await callGroq(sectionPrompt);
    res.json({ ...data, sourceText: extractedText });
  } catch (error) {
    console.error('Upload Analyze Error:', error);
    res.status(500).json({ error: 'Failed to analyze uploaded file.' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ResuVibe API is running! 🚀' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎯 ResuVibe backend running on http://localhost:${PORT}`);
  console.log(`📡 POST /analyze endpoint ready`);
});