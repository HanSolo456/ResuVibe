# ResuVibe Multi-API Setup Guide

## Quick Start

### 1️⃣ Get API Keys

**Google Gemini** (Primary):
- Go to https://ai.google.dev/
- Click "Get API key"
- Copy the key

**Groq** (Fallback):
- Go to https://console.groq.com/
- Sign up/Login
- Create API keys (generate 3-5 for better rate limit spreading)
- Copy all keys

### 2️⃣ Configure Environment

In `server/.env`, add your keys:

```bash
# If using Gemini (primary)
GOOGLE_API_KEY=sk_gemini_xxxxx

# If using Groq (fallback or primary)
# Paste all your Groq keys, comma-separated (no spaces)
GROQ_API_KEYS=gsk_xxx1,gsk_xxx2,gsk_xxx3

# Server
PORT=3000
```

### 3️⃣ Test the Setup

```bash
cd server
npm install
npm start
```

You should see:
```
🚀 ResuVibe Backend Running on http://localhost:3000
📊 API Providers:
   - Gemini: ✅ Enabled (Primary)
   - Groq: ✅ Enabled (3 keys)
```

Check health:
```bash
curl http://localhost:3000/health
```

---

## How It Works

### Request Flow

```
User Makes Request
    ↓
Try Gemini (if GOOGLE_API_KEY set)
    ↓
Success? → Return ✅
    ↓
Quota Exceeded (429)?
    ↓
Try Groq (rotate key #1, #2, #3...)
    ↓
Success? → Return ✅ (logs show which key used)
    ↓
Error? → Return 500 error message
```

### Key Rotation Example

If you have 3 Groq keys:
- Request 1 → Uses key #1
- Request 2 → Uses key #2
- Request 3 → Uses key #3
- Request 4 → Uses key #1 (cycles back)

### Logs to Watch

```
✅ Successfully used Gemini API
   → Your Gemini key worked

⚠️ Gemini quota exceeded, falling back to Groq...
   → Gemini hit quota, switching to Groq

✅ Successfully used Groq API (Key index: 1)
   → Groq worked, used key #2 (index 1 = second key)
```

---

## Common Issues

### "No Groq API keys available. Set GROQ_API_KEYS in .env"
**Solution**: Add `GROQ_API_KEYS` to `server/.env` with at least one key:
```bash
GROQ_API_KEYS=gsk_xxxxx
```

### "Server misconfiguration: Set GOOGLE_API_KEY or GROQ_API_KEYS in .env"
**Solution**: Add at least one of:
- `GOOGLE_API_KEY=sk_gemini_xxxxx`
- `GROQ_API_KEYS=gsk_xxxxx`

### Groq quota errors
**Solution**: Generate more keys and add them all:
```bash
GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3,gsk_key4,gsk_key5
```

### Inconsistent responses
**Solution**: Check that your system prompt in `server/index.js` matches across endpoints. Both `/analyze` and `/upload-analyze` use the same `SYSTEM_PROMPT`.

---

## Deploying with Multi-API

### On Render (Backend)

1. Push code to GitHub
2. Create Web Service on Render
3. Add these Environment Variables:
   ```
   GOOGLE_API_KEY = (your Gemini key or leave blank)
   GROQ_API_KEYS = gsk_xxx1,gsk_xxx2,gsk_xxx3
   PORT = 3000
   ```

### On Netlify (Frontend)

1. Create site from GitHub
2. Add Environment Variable:
   ```
   VITE_API_URL = https://your-backend.onrender.com
   ```

---

## FAQ

**Q: Do I need both Gemini and Groq?**
A: No! Either one works. Use both for zero-downtime fallback.

**Q: Which API is cheaper?**
A: Both have free tiers. Groq gives more free usage (unlimited inference with quota). Gemini is faster but has stricter quota.

**Q: How many Groq keys do I need?**
A: Start with 2-3. Each has 30k TPM (tokens per minute). 3 keys = ~90k TPM total.

**Q: Can I rotate keys without restarting?**
A: Yes! The rotation happens automatically per-request. Just restart to pick up new `.env` values.

**Q: What if Groq key is also rate-limited?**
A: Requests fail with error message. Add more keys and restart.

**Q: How do I monitor which API is being used?**
A: Check backend logs or curl `/health` endpoint.

---

## Next Steps

1. ✅ Add API keys to `server/.env`
2. ✅ Start backend: `cd server && npm start`
3. ✅ Check health: `curl http://localhost:3000/health`
4. ✅ Start frontend: `npm run dev` (from root)
5. ✅ Test with resume upload

Happy analyzing! 🔥
