# ResuVibe - AI Resume Analysis Tool 🔥

A brutally honest AI-powered resume analyzer that gives you the real vibe check your resume needs. Get roasted, get better, get hired.

## 🚀 Live Demo
- **Frontend**: [Netlify](https://resuvibe.netlify.app)
- **Backend**: [Railway](https://resuvibe-production.up.railway.app)

## 📦 Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: Groq API (GPT-OSS-120B, Llama 3.3 70B, Mixtral)
- **Styling**: Tailwind CSS (Neubrutalist design)
- **Charts**: Recharts
- **Export**: html2canvas, jsPDF

## ✨ Features

### Core Analysis
- ✅ AI scoring (0–100) with variance disclaimer (±10 points)
- ✅ 4 savage, non-repetitive roasts
- ✅ 3 actionable improvements
- ✅ 6 vibe labels (Startup-Ready, Resume-Padding Energy, etc.)
- ✅ Name extraction from resume header
- ✅ Section-wise fixes (Summary, Experience, Projects, Education, Skills, Certifications)

### Buzzword Heatmap
- ✅ Green Flags: Strong action-oriented phrases with metrics
- ✅ Red Flags: Weak/vague buzzwords to remove

### Job Description Matching
- ✅ Missing keywords analysis
- ✅ Tailored suggestions based on JD

### Shareable Roast Card
- ✅ Spotify Wrapped-style social cards
- ✅ Aspect ratios: 1:1 (Square) or 9:16 (Portrait)
- ✅ Card modes: Clean (professional) or Roast (savage)
- ✅ PNG download for Instagram/LinkedIn/Twitter

### The Interrogator (Interview Prep) ⚔️
- ✅ 3 targeted technical questions based on resume
- ✅ Interactive 3D flip flashcards
- ✅ Cheat sheets with model answers
- ✅ Dark "Battle Zone" UI theme

### UX Features
- ✅ Before vs After comparison modal
- ✅ Copy suggestions per bullet
- ✅ PDF upload support (text paste recommended for accuracy)
- ✅ Sample resume for quick testing
- ✅ Export improved resume as PDF

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Groq API key(s) ([Get them here](https://console.groq.com/))

### Setup

1. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Configure environment variables**
   
   Create `.env` in root:
   ```
   VITE_API_URL=http://localhost:3000
   ```
   
   Create `server/.env`:
   ```
   GROQ_API_KEYS=gsk_xxxxx,gsk_yyyyy,gsk_zzzzz
   PORT=3000
   ```

3. **Run backend**:
   ```bash
   cd server
   npm run dev
   ```

4. **Run frontend** (new terminal):
   ```bash
   npm run dev
   ```

5. **Open**: http://localhost:5173

---

## 🔄 Multi-Model Fallback System

ResuVibe uses an intelligent fallback system for reliability:

### Models (in order of preference)
1. `openai/gpt-oss-120b` - Primary model
2. `llama-3.3-70b-versatile` - First fallback
3. `llama-3.1-8b-instant` - Fast fallback
4. `mixtral-8x7b-32768` - Final fallback

### Key Rotation
- Multiple Groq API keys can be comma-separated
- Keys rotate automatically on each request
- Rate limit spreading: 30k TPM per key → 90k+ TPM with 3 keys

---

## 🚢 Deployment

### Backend → Railway
1. Push to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. **Root Directory**: `server`
4. **Start Command**: `npm start`
5. Add env vars:
   - `GROQ_API_KEYS` (comma-separated)
   - `PORT` (default: 3000)
6. Generate domain under Settings → Networking

### Frontend → Netlify
1. [netlify.com](https://netlify.com) → New site from Git
2. **Build**: `npm run build` | **Publish**: `dist`
3. Add env var: `VITE_API_URL=https://your-backend.up.railway.app`

---

## 🔌 API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Analyze pasted resume text |
| `/upload-analyze` | POST | Upload PDF and analyze |
| `/health` | GET | Health check with API status |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| PDF vs Text score difference | Pasted text is more accurate due to formatting preservation |
| CORS errors | Ensure `VITE_API_URL` includes `https://` |
| 500 errors | Check `GROQ_API_KEYS` is plural (with 'S') in Railway |
| Rate limits | Add more Groq API keys (comma-separated) |
| Invalid JSON | Server auto-sanitizes; check logs for details |

---

## 📁 Project Structure
```
resuvibe/
├── App.tsx                 # Main application component
├── components/
│   ├── Button.tsx          # Neubrutalist button
│   ├── Card.tsx            # Card wrapper
│   └── RoastCard.tsx       # Shareable social card
├── services/
│   └── geminiService.ts    # API client
├── types.ts                # TypeScript interfaces
├── server/
│   ├── index.js            # Express server + AI
│   └── .env                # Environment (gitignored)
└── package.json
```

---

## 🎨 Design System

**Neubrutalist Aesthetic:**
- Hard shadows (8px black)
- Bold uppercase typography
- Orange (#FF4D00) + Black/White palette
- Thick borders (2px)
- No gradients

---

## 👨‍💻 Author
**Saumitra Matta**

Built with ❤️ and a lot of ☕
