import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Gemini Setup
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// Groq Setup - Multiple keys for rotation
const GROQ_API_KEYS = (process.env.GROQ_API_KEYS || '').split(',').filter(k => k.trim());
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
let currentGroqKeyIndex = 0;

function getNextGroqKey() {
  if (GROQ_API_KEYS.length === 0) {
    return null;
  }
  const key = GROQ_API_KEYS[currentGroqKeyIndex];
  currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_API_KEYS.length;
  return key;
}

// Groq API caller with key rotation
// Models to try in order of preference
const GROQ_MODELS = [
  process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768'
];

// Groq API caller with key rotation, model fallback, and retries
async function callGroq(messages) {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('No Groq API keys available. Set GROQ_API_KEYS in .env');
  }

  let attempt = 0;
  // Total attempts = keys * models (approximate simple strategy: try all keys on model 1, then all keys on model 2...)
  // But to keep it simple and avoid 9 loops:
  // We'll try:
  // 1. Current Model + All Keys
  // 2. If all 429, Switch Model + All Keys

  for (const model of GROQ_MODELS) {
    console.log(`🤖 Trying model: ${model}`);

    // Reset key index for new model to give fresh chance? Or just continue?
    // Let's try attempting all keys for this model.
    let keyAttempt = 0;
    const maxKeyAttempts = GROQ_API_KEYS.length;

    while (keyAttempt < maxKeyAttempts) {
      const key = getNextGroqKey();
      console.log(`   🔑 Key index ${currentGroqKeyIndex === 0 ? GROQ_API_KEYS.length - 1 : currentGroqKeyIndex - 1} (Model ${model})`);

      try {
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages,
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          const err = await response.text();
          if (response.status === 429) {
            console.warn(`   ⚠️ Rate limit (429) on ${model}. Rotating key...`);
            keyAttempt++;
            continue;
          }
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
            // Maybe try parsing as simple object if JSON format failed but text exists
            throw new Error(`Invalid JSON from Groq: ${text}`);
          }
        }
        console.log(`✅ Success with ${model}`);
        return data;

      } catch (error) {
        if (error.message.includes('429')) {
          keyAttempt++;
          continue;
        }
        console.warn(`   ❌ Non-429 error on ${model}: ${error.message}`);
        keyAttempt++; // Move to next key on error too? Or next model? let's try next key.
      }
    }
    console.warn(`⚠️ All keys failed for model ${model}. Falling back to next model...`);
  }

  throw new Error(`All Groq keys and available models failed.`);
}

async function callAI(messages) {
  // Try Gemini first (if configured)
  if (genAI && GOOGLE_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const contents = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        }
      });

      const text = result.response.text();
      let cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      cleanedText = cleanedText.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');

      let data;
      try {
        data = JSON.parse(cleanedText);
      } catch (e) {
        const match = cleanedText.match(/\{[\s\S]*\}/);
        if (match) {
          let cleaned = match[0].replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
          data = JSON.parse(cleaned);
        } else {
          throw new Error(`Invalid JSON from Gemini: ${cleanedText}`);
        }
      }
      console.log('✅ Using Gemini API');
      return data;
    } catch (geminiError) {
      // If Gemini fails with quota error, fallback to Groq
      if (geminiError.status === 429) {
        console.log('⚠️ Gemini quota exceeded, falling back to Groq...');
        if (GROQ_API_KEYS.length > 0) {
          return await callGroq(messages);
        }
      }
      throw geminiError;
    }
  }

  // If no Gemini or it failed, use Groq
  console.log('📡 Using Groq API');
  return await callGroq(messages);
}

// POST /analyze - The main endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({
        error: "Resume text is too short. Please provide at least 50 characters."
      });
    }

    if (!GOOGLE_API_KEY && GROQ_API_KEYS.length === 0) {
      return res.status(500).json({
        error: "Server misconfiguration: Set GOOGLE_API_KEY or GROQ_API_KEYS in .env"
      });
    }

    let systemPrompt = `You are "ResuVibe Recruiter AI" — a Gen-Z technical recruiter who screens resumes in under 10 seconds. Your job: Analyze how this resume FEELS to a recruiter, not just what it says.`;

    if (jobDescription) {
      systemPrompt += `\n\nCONTEXT: The candidate is applying for a specific job. You MUST evaluate the resume against the provided JOB DESCRIPTION.`;
    }

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}

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
${jobDescription ? '6. TAILOR wording to match the Job Description keywords/tone where honest and applicable.' : ''}

KEYWORD GAP ANALYSIS:
${jobDescription ? 'Identify top 3-5 HARD SKILLS or CERTIFICATIONS explicitly mentioned in the JD that are completely MISSING from the resume. List them as "missingKeywords".' : 'Do NOT include "missingKeywords" field if no Job Description is provided.'}

BUZZWORD HEATMAP (EXACTLY 3-5 each):
GREEN FLAGS: Extract 3-5 STRONG action-oriented phrases from the resume that show REAL impact. Look for:
- Specific metrics/numbers (e.g., "Deployed to 10K users", "Reduced latency by 40%")
- Leadership/ownership verbs (e.g., "Led team of 5", "Architected system")
- Concrete deliverables (e.g., "Shipped to production", "Published research paper")
BAD: ❌ "Worked on projects" GOOD: ✅ "Shipped 3 features to 50K users"

RED FLAGS: Extract 3-5 WEAK/VAGUE buzzwords or phrases that should be removed. Look for:
- Generic adjectives without proof (e.g., "Hard worker", "Passionate", "Detail-oriented")
- Passive/weak verbs (e.g., "Responsible for", "Helped with", "Assisted in")
- Meaningless corporate jargon (e.g., "Synergy", "Think outside the box", "Team player")
BAD: ❌ "Optimized performance" (if no metric) GOOD: ✅ "Passionate" (generic fluff)

EXAMPLE - BAD vs GOOD suggested rewrites:

EXAMPLE - BAD vs GOOD suggested rewrites:

ORIGINAL: "Web Development Intern | Prodigy InfoTech Aug 2024 – Sept 2024. Supported the development and maintenance of responsive websites, utilized HTML, CSS, and JavaScript"

❌ BAD (removes all details): "Improved website responsiveness by ~25% as a web development intern"

✅ GOOD (keeps details, improves wording): "Web Development Intern | Prodigy InfoTech (Aug–Sept 2024): Engineered responsive web interfaces using HTML, CSS, and JavaScript; collaborated with design team to optimize user experience and resolve cross-browser compatibility issues"

INTERVIEW QUESTIONS (THE INTERROGATOR):
Act as a SKEPTICAL HIRING MANAGER looking at the specific projects and skills listed. Generate 3 TARGETED technical interview questions to test their knowledge.
- Rules: NO generic questions ("What is your weakness?"). Questions MUST reference specific technologies/projects from the resume (e.g. "You used MongoDB for the e-commerce app; how did you handle data consistency?").
- Hint: Provide a short "Model Answer" logic or key talking point.

JSON FORMAT (EXACT KEYS):
{"name": string, "score": number (0-100 integer), "label": string, "description": string, "recruiterSnapshot": string, "overview": string, "sections": {"summary": {"issues": string[], "suggested": string[]}, "experience": {"issues": string[], "suggested": string[]}, "projects": {"issues": string[], "suggested": string[]}, "education": {"issues": string[], "suggested": string[]}, "skills": {"issues": string[], "suggested": string[]}, "certifications": {"issues": string[], "suggested": string[]}}, "roasts": [string, string, string, string], "improvements": [string, string, string], "missingKeywords": [string, string, string], "greenFlags": [string, string, string], "redFlags": [string, string, string], "interviewQuestions": [{"question": string, "hint": string}, {"question": string, "hint": string}, {"question": string, "hint": string}]}`
      },
      {
        role: 'user',
        content: `Resume Text:\n${resumeText}\n\n${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ''}`
      }
    ];

    const data = await callAI(messages);
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
    const { jobDescription } = req.body;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration: missing GOOGLE_API_KEY.' });
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

    let systemPrompt = `You are "ResuVibe Recruiter AI" — a Gen-Z technical recruiter who screens resumes in under 10 seconds. Your job: Analyze how this resume FEELS to a recruiter, not just what it says.`;

    if (jobDescription) {
      systemPrompt += `\n\nCONTEXT: The candidate is applying for a specific job. You MUST evaluate the resume against the provided JOB DESCRIPTION.`;
    }

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}

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
${jobDescription ? '6. TAILOR wording to match the Job Description keywords/tone where honest and applicable.' : ''}

KEYWORD GAP ANALYSIS:
${jobDescription ? 'Identify top 3-5 HARD SKILLS or CERTIFICATIONS explicitly mentioned in the JD that are completely MISSING from the resume. List them as "missingKeywords".' : 'Do NOT include "missingKeywords" field if no Job Description is provided.'}

BUZZWORD HEATMAP (EXACTLY 3-5 each):
GREEN FLAGS: Extract 3-5 STRONG action-oriented phrases from the resume that show REAL impact. Look for:
- Specific metrics/numbers (e.g., "Deployed to 10K users", "Reduced latency by 40%")
- Leadership/ownership verbs (e.g., "Led team of 5", "Architected system")
- Concrete deliverables (e.g., "Shipped to production", "Published research paper")
BAD: ❌ "Worked on projects" GOOD: ✅ "Shipped 3 features to 50K users"

RED FLAGS: Extract 3-5 WEAK/VAGUE buzzwords or phrases that should be removed. Look for:
- Generic adjectives without proof (e.g., "Hard worker", "Passionate", "Detail-oriented")
- Passive/weak verbs (e.g., "Responsible for", "Helped with", "Assisted in")
- Meaningless corporate jargon (e.g., "Synergy", "Think outside the box", "Team player")
BAD: ❌ "Optimized performance" (if no metric) GOOD: ✅ "Passionate" (generic fluff)

EXAMPLE - BAD vs GOOD suggested rewrites:

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

INTERVIEW QUESTIONS (THE INTERROGATOR):
Act as a SKEPTICAL HIRING MANAGER looking at the specific projects and skills listed. Generate 3 TARGETED technical interview questions to test their knowledge.
- Rules: NO generic questions ("What is your weakness?"). Questions MUST reference specific technologies/projects from the resume.
- Hint: Provide a short "Model Answer" logic.

JSON FORMAT (EXACT KEYS):
{"name": string, "score": number (0-100 integer), "label": string, "description": string, "recruiterSnapshot": string, "overview": string, "sections": {"summary": {"issues": string[], "suggested": string[]}, "experience": {"issues": string[], "suggested": string[]}, "projects": {"issues": string[], "suggested": string[]}, "education": {"issues": string[], "suggested": string[]}, "skills": {"issues": string[], "suggested": string[]}, "certifications": {"issues": string[], "suggested": string[]}}, "roasts": [string, string, string, string], "improvements": [string, string, string], "missingKeywords": [string, string, string], "greenFlags": [string, string, string], "redFlags": [string, string, string], "interviewQuestions": [{"question": string, "hint": string}, {"question": string, "hint": string}, {"question": string, "hint": string}]}`
      },
      {
        role: 'user',
        content: `Resume Text:\n${extractedText}\n\n${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ''}`
      }
    ];

    const data = await callAI(messages);
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