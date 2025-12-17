# ResuVibe - AI Resume Analysis Tool 🔥

A brutally honest AI-powered resume analyzer that gives you the real vibe check your resume needs.

## 🚀 Live Demo
- **Frontend**: [Deploy on Netlify]
- **Backend**: [Deploy on Render]

## 📦 Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Groq (llama-3.3-70b-versatile)
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Groq API key ([Get it here](https://console.groq.com))

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
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
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

## 🚢 Deployment

### Backend → Render
1. Push to GitHub
2. render.com → New Web Service
3. Root Directory: `server`
4. Build: `npm install` | Start: `npm start`
5. Add env vars: `GROQ_API_KEY`, `GROQ_MODEL`, `PORT`

### Frontend → Netlify
1. netlify.com → New site from Git
2. Build: `npm run build` | Publish: `dist`
3. Add env var: `VITE_API_URL=https://your-backend.onrender.com`

## 🔌 API Endpoints
- `POST /analyze` — Analyze pasted text. Returns full JSON including `sections` and `sourceText`.
- `POST /upload-analyze` — Upload PDF/DOCX/TXT; extracts text and returns the same JSON.
- `GET /` — Health check.

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
- Ensure `server/.env` contains a valid `GROQ_API_KEY`.
- If the model returns invalid JSON, the server sanitizes and parses; check logs for details.

## 🤝 GitHub Readiness
- `.gitignore` excludes `node_modules`, build outputs, and env files.
- Example env files provided: `.env.example`, `server/.env.example`.
- Clear setup and run instructions.
- No secrets committed; use your own `.env` files locally or on CI/CD.

## 👨‍💻 Hackathon Submission
Built with ☕ and 🔥 roasts
