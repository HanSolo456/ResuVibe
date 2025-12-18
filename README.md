# ResuVibe - AI Resume Analysis Tool 🔥

A brutally honest AI-powered resume analyzer that gives you the real vibe check your resume needs.

## 🚀 Live Demo
- **Frontend**: [Deploy on Netlify]
- **Backend**: [Deploy on Render]

## 📦 Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Google Gemini (gemini-2.0-flash)
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Google Gemini API key ([Get it here](https://ai.google.dev/))

### Setup

1. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Configure environment variables**
   
   Create `.env` in root (copy from `.env.example`):
   ```
   VITE_API_URL=http://localhost:3000
   ```
   
   Create `server/.env`:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   PORT=3000
   ```

3. **Run backend**:
   ```bash
   cd server
   npm start
   ```
4. **Run frontend** (new terminal):
   ```bash
   npm run dev
   ```
5. **Open**: http://localhost:5173

## 🔄 Multi-API Fallback System

ResuVibe uses an intelligent fallback system to handle API rate limits:

### How It Works
1. **Primary**: Attempts Google Gemini API first (if `GOOGLE_API_KEY` is set)
2. **Fallback**: If Gemini returns 429 (quota exceeded), automatically switches to Groq
3. **Key Rotation**: Groq keys are rotated through the `GROQ_API_KEYS` list on each request

### Setup Instructions

#### Option 1: Gemini Only (Fastest)
```bash
GOOGLE_API_KEY=sk_gemini_xxxxx
PORT=3000
```

#### Option 2: Groq Only (Unlimited with multiple keys)
```bash
# Generate 3-5 Groq keys from https://console.groq.com/
GROQ_API_KEYS=gsk_xxx,gsk_yyy,gsk_zzz
PORT=3000
```

#### Option 3: Both (Recommended - Gemini + Groq fallback)
```bash
GOOGLE_API_KEY=sk_gemini_xxxxx
GROQ_API_KEYS=gsk_xxx,gsk_yyy,gsk_zzz
PORT=3000
```

### Why Multiple Groq Keys?
- **Rate Limit Spreading**: 30k TPM per key → 90k TPM with 3 keys
- **Automatic Rotation**: Each request uses the next key in rotation
- **Zero Downtime**: If one key is rate-limited, others are still available

### Monitoring
- Backend logs show which API provider is being used:
   - `📡 Attempting Gemini API...` → Trying Gemini
   - `✅ Successfully used Gemini API` → Gemini worked
   - `⚠️ Gemini quota exceeded, falling back to Groq...` → Quota hit, switched to Groq
   - `✅ Successfully used Groq API (Key index: 0)` → Groq worked

### Health Check
```bash
curl http://localhost:3000/health
```
Response:
```json
{
   "status": {
      "gemini": "✅ Configured",
      "groq": "✅ 3 keys"
   },
   "message": "Server is running"
}
```

## 🚢 Deployment

### Backend → Render
1. Push to GitHub
2. render.com → New Web Service
3. Root Directory: `server`
4. Build: `npm install` | Start: `npm start`
5. Add env vars: 
   - `GOOGLE_API_KEY` (optional, if using Gemini)
   - `GROQ_API_KEYS` (optional, if using Groq - comma-separated)
   - `PORT` (default: 3000)

### Frontend → Netlify
1. netlify.com → New site from Git
2. Build: `npm run build` | Publish: `dist`
3. Add env var: `VITE_API_URL=https://your-backend.onrender.com`

## 🔌 API Endpoints
- `POST /analyze` — Analyze pasted text. Returns full JSON including `sections` and `sourceText`.
- `POST /upload-analyze` — Upload PDF/DOCX/TXT; extracts text and returns the same JSON.
- `GET /health` — Health check (shows Gemini and Groq status).

## 📝 Features
✅ AI scoring (0–100)  
✅ 4 savage, non-repetitive roasts  
✅ 3 actionable improvements  
✅ 6 vibe labels  
✅ Name extraction  
✅ Section-wise fixes (Summary, Experience, Projects, Education, Skills, Certifications)  
✅ Before vs After comparison modal  
✅ Copy suggestions per bullet  
✅ Export improved resume as HTML or PDF (jsPDF)

## 🔧 Troubleshooting
- PDF downloads blank → now fixed using jsPDF (text-based). 
- `VITE_API_URL` must be the base URL, e.g., `http://localhost:3000` (do not append `/analyze`).
- Ensure `server/.env` contains a valid `GOOGLE_API_KEY`.
- If the model returns invalid JSON, the server sanitizes and parses; check logs for details.

## 🤝 GitHub Readiness
- `.gitignore` excludes `node_modules`, build outputs, and env files.
- Example env files provided: `.env.example`, `server/.env.example`.
- Clear setup and run instructions.
- No secrets committed; use your own `.env` files locally or on CI/CD.

## 👨‍💻 Hackathon Submission
Built with ☕ and 🔥 roasts
