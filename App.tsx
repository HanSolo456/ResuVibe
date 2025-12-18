import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Play, Github, AlertTriangle, Terminal, Quote, Check, AlertCircle, Camera, Download, FileText, Copy, CheckCircle2, Swords } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { analyzeResume, analyzeResumeFile } from './services/geminiService';
import { ResumeAnalysis, AnalysisStatus, SectionFeedback } from './types';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { RoastCard } from './components/RoastCard';
import html2canvas from 'html2canvas';

const SAMPLE_RESUME = `Software Engineer with 2 years of experience.
- Worked on multiple projects using React and Node.js.
- Helped the team deliver features on time.
- Good at communication and teamwork.
- Graduated from Tech University with a degree in Computer Science.
- Skills: Java, Python, C++, JavaScript, HTML, CSS, React, Angular, Vue, SQL, NoSQL, MongoDB, Postgres, AWS, Docker, Kubernetes, Git, Jira.`;

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="sm"
      className={`px - 3 py - 1 text - xs shrink - 0 transition - all ${copied ? 'bg-green-600 border-green-700 text-white' : ''} `}
      variant={copied ? 'primary' : 'outline'}
      onClick={handleCopy}
    >
      {copied ? (
        <span className="flex items-center gap-1 font-bold">
          <CheckCircle2 className="w-3 h-3" /> COPIED!
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Copy className="w-3 h-3" /> Copy
        </span>
      )}
    </Button>
  );
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showJDInput, setShowJDInput] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('summary');

  // Share Card state
  const [showShareModal, setShowShareModal] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
  const [cardMode, setCardMode] = useState<'clean' | 'roast'>('roast');

  // Battle Zone State
  const [revealedCard, setRevealedCard] = useState<number | null>(null);
  const [revealedHint, setRevealedHint] = useState<number | null>(null);

  useEffect(() => {
    if (showDiff || showShareModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDiff, showShareModal]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setStatus(AnalysisStatus.LOADING);
    setError(null);

    try {
      const data = await analyzeResume(inputText, jobDescription);
      setResult(data);
      setStatus(AnalysisStatus.SUCCESS);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_RESUME);
    document.getElementById('input-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChooseFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    (async () => {
      try {
        const data = await analyzeResumeFile(file, jobDescription);
        setResult(data);
        setStatus(AnalysisStatus.SUCCESS);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err: any) {
        setError(err.message || 'File analysis failed.');
        setStatus(AnalysisStatus.ERROR);
      } finally {
        // reset input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    })();
  };

  const buildImprovedResumeHTML = (r: ResumeAnalysis) => {
    const s = r.sections || {} as any;
    const sec = (key: string) => s[key] || { issues: [], suggested: [] };
    const sectionKeys = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'];
    const sectionHtml = sectionKeys.map(k => {
      const sf = sec(k);
      if (!sf.suggested?.length) return '';
      const title = k.charAt(0).toUpperCase() + k.slice(1);
      const sugg = (sf.suggested || []).map((x: string) => `< li style = "margin-bottom:8px;" > ${x}</li > `).join('');
      return `< section style = "margin:24px 0;" >
        <h2 style="margin:0 0 12px 0; font-size:20px; border-bottom:2px solid #000; padding-bottom:4px;">${title}</h2>
        <ul style="margin:0; padding-left:20px;">${sugg}</ul>
      </section > `;
    }).join('');
    return `< !doctype html > <html><head><meta charset="utf-8"><title>Improved Resume</title><style>body{font - family:Arial,Helvetica,sans-serif;line-height:1.6;padding:40px;max-width:800px;margin:0 auto;}h1{margin - top:0;border-bottom:4px solid #FF4D00;padding-bottom:8px;}p{margin:16px 0;}</style></head><body>
  <h1>${r.name || 'Candidate'}</h1>
  ${r.overview ? `<p style="font-size:16px; font-style:italic; color:#333;">${r.overview}</p>` : ''}
  ${sectionHtml || '<p>No section improvements available.</p>'}
</body></html>`;
  };

  const handleDownloadImproved = () => {
    if (!result) return;
    const html = buildImprovedResumeHTML(result);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (result.name ? result.name.replace(/\s+/g, '_') : 'improved_resume') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadShareCard = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#FDFBF7',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `resuvibe - roast - ${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating share card:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = 25;

      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(result.name || 'Candidate', margin, y);
      y += 8;

      // Orange line under title
      doc.setDrawColor(255, 77, 0);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      // Overview
      if (result.overview) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        const overviewLines = doc.splitTextToSize(result.overview, maxWidth);
        doc.text(overviewLines, margin, y);
        y += overviewLines.length * 5 + 10;
      }

      doc.setTextColor(0, 0, 0);

      // Sections
      const s = result.sections || {} as any;
      const sectionKeys = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'];

      sectionKeys.forEach(key => {
        const sec = s[key];
        if (sec?.suggested?.length) {
          // Check if we need a new page
          if (y > 260) {
            doc.addPage();
            y = 25;
          }

          // Section title
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(key.charAt(0).toUpperCase() + key.slice(1), margin, y);
          y += 2;

          // Line under section
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(margin, y, margin + 50, y);
          y += 8;

          // Bullet points
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');

          sec.suggested.forEach((text: string) => {
            if (y > 270) {
              doc.addPage();
              y = 25;
            }
            const lines = doc.splitTextToSize('• ' + text, maxWidth - 5);
            doc.text(lines, margin + 3, y);
            y += lines.length * 5 + 3;
          });

          y += 8;
        }
      });

      doc.save((result.name ? result.name.replace(/\s+/g, '_') : 'improved_resume') + '.pdf');
    } catch (e) {
      console.error('PDF generation error:', e);
      alert('PDF generation failed. Try Download HTML instead.');
    }
  };

  // Data for the donut chart
  const chartData = result ? [
    { name: 'Score', value: result.score },
    { name: 'Remaining', value: 100 - result.score }
  ] : [];

  const CHART_COLORS = ['#FF4D00', '#E5E7EB'];

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-[#FF4D00] selection:text-white">

      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none bg-grid-pattern"></div>

      {/* Before/After Modal Overlay */}
      {showDiff && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowDiff(false)}
        >
          <div
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <h3 className="text-xl font-black uppercase">Before vs After</h3>
              <button
                onClick={() => setShowDiff(false)}
                className="text-2xl hover:text-[#FF4D00] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden">
              <div className="p-6 bg-red-50 border-r-2 border-black overflow-auto">
                <h4 className="text-lg font-bold mb-3 flex items-center gap-2 sticky top-0 bg-red-50 pb-2">
                  <span className="text-red-600">❌</span> Before (Raw)
                </h4>
                <div className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {(result?.sourceText || inputText).slice(0, 3000)}
                  {(result?.sourceText || inputText).length > 3000 && '\n\n... (truncated)'}
                </div>
              </div>
              <div className="p-6 bg-green-50 overflow-auto">
                <h4 className="text-lg font-bold mb-3 flex items-center gap-2 sticky top-0 bg-green-50 pb-2">
                  <span className="text-green-600">✅</span> After (Improved)
                </h4>
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: Object.entries((result?.sections || {}) as Record<string, SectionFeedback>)
                      .map(([k, v]) => {
                        if (!v?.suggested?.length) return '';
                        const title = k.charAt(0).toUpperCase() + k.slice(1);
                        return `< div style = "margin-bottom:20px;" ><strong style="font-size:16px;color:#059669;">${title}</strong><ul style="margin:8px 0 0 0; padding-left:20px; line-height:1.6;">${v.suggested.map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('')}</ul></div > `;
                      })
                      .filter(Boolean)
                      .join('') || '<p class="text-gray-500">No improvements generated yet.</p>'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#FDFBF7] border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#FF4D00]">
              <span className="font-mono font-bold text-xl">R/</span>
            </div>
            <span className="font-bold text-2xl tracking-tighter uppercase hidden sm:block">ResuVibe</span>
          </div>
          <nav className="flex items-center gap-4 md:gap-8 text-sm font-mono font-bold uppercase tracking-wide">
            <a
              href="#input-section"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('input-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="hover:bg-black hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Analyzer
            </a>
            <a
              href="https://github.com/HanSolo456/ResuVibe/tree/main"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">Source</span>
            </a>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 z-10 border-b-2 border-black bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="inline-block bg-white border-2 border-black px-4 py-2 font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_0px_#000000]">
              First Impression Engine
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase text-black">
              Resume <br />
              <span className="text-[#FF4D00] underline decoration-4 underline-offset-8 decoration-black">Vibe Check</span>
            </h1>
            <p className="text-xl md:text-2xl font-mono border-l-4 border-black pl-6 max-w-lg leading-relaxed text-gray-800">
              Does your resume actually work? Or is it just words? Get a brutally honest critique.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <Button size="lg" onClick={() => document.getElementById('input-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Start Check
              </Button>
              <Button size="lg" variant="outline" onClick={handleLoadSample}>
                Load Sample
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            {/* Decorative Brutalist Elements */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF4D00] rounded-full border-2 border-black z-0 opacity-20"></div>
            <div className="absolute -bottom-8 -left-8 w-full h-full border-2 border-black bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+CjxwYXRoIGQ9Ik0wIDBMODIDIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] z-0"></div>

            <Card className="relative z-10 w-full max-w-md mx-auto transform rotate-2 bg-white">
              <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                <span className="font-mono font-bold text-sm">LOG_OUTPUT.txt</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 border-2 border-black bg-white"></div>
                  <div className="w-3 h-3 border-2 border-black bg-black"></div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-mono text-xs text-gray-500 mb-1">SCORE</div>
                    <div className="text-7xl font-black">78<span className="text-2xl text-[#FF4D00]">%</span></div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-gray-500 mb-1">DECISION</div>
                    <div className="bg-[#FF4D00] text-white border-2 border-black px-3 py-1 font-bold text-sm shadow-[2px_2px_0px_0px_#000]">MAYBE</div>
                  </div>
                </div>

                <div className="w-full bg-white border-2 border-black h-6 p-0.5">
                  <div className="h-full bg-black w-[78%]"></div>
                </div>

                <div className="font-mono text-sm leading-relaxed p-4 bg-gray-50 border-2 border-black">
                  <span className="text-[#FF4D00] font-bold"></span> "Solid skills detected. Tone is confident but borderline generic."
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* INPUT SECTION */}
      <section id="input-section" className="py-24 bg-white relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">Input Data</h2>
              <p className="font-mono text-gray-600 border-l-2 border-[#FF4D00] pl-3">Paste raw text. Formatting is irrelevant.</p>
            </div>
            <div className="font-mono text-xs bg-black text-white border-2 border-black px-3 py-1 shadow-[4px_4px_0px_0px_#FF4D00]">
              CHARS: {inputText.length}
            </div>
          </div>

          <div className="relative">
            <div className="absolute top-0 left-0 w-full h-10 bg-[#E5E7EB] border-2 border-black border-b-0 flex items-center px-4 justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-black">
                <Terminal className="w-4 h-4" />
                <span>user_resume.txt</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full border border-black bg-white"></div>
                <div className="w-3 h-3 rounded-full border border-black bg-white"></div>
              </div>
            </div>
            <textarea
              className="w-full h-96 pt-14 pb-6 px-6 bg-[#FDFBF7] border-2 border-black text-lg font-mono placeholder:text-gray-400 focus:outline-none focus:bg-white resize-none shadow-[8px_8px_0px_0px_#000000] transition-colors"
              placeholder="// Paste your resume content here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={status === AnalysisStatus.LOADING}
            ></textarea>
          </div>

          {/* Collapsible Job Description Section */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowJDInput(!showJDInput)}
              className="w-full flex items-center justify-between p-4 bg-yellow-50 border-2 border-black font-mono text-sm font-bold hover:bg-yellow-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                {showJDInput ? '▼' : '▶'} Job Description (Optional) - Click to {showJDInput ? 'Hide' : 'Show'}
              </span>
              <span className="text-xs text-gray-600">Get tailored advice for a specific role</span>
            </button>

            {showJDInput && (
              <div className="mt-0 relative">
                <div className="absolute top-0 left-0 w-full h-10 bg-[#E5E7EB] border-2 border-black border-t-0 border-b-0 flex items-center px-4 justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-black">
                    <Terminal className="w-4 h-4" />
                    <span>job_description.txt</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full border border-black bg-white"></div>
                    <div className="w-3 h-3 rounded-full border border-black bg-white"></div>
                  </div>
                </div>
                <textarea
                  className="w-full h-48 pt-14 pb-6 px-6 bg-[#FDFBF7] border-2 border-black border-t-0 text-lg font-mono placeholder:text-gray-400 focus:outline-none focus:bg-white resize-none shadow-[8px_8px_0px_0px_#000000] transition-colors"
                  placeholder="// Paste the Job Description here to get tailored advice..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={status === AnalysisStatus.LOADING}
                ></textarea>
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="hidden md:flex items-center gap-4">
              <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-white shadow-[4px_4px_0px_0px_#000]">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div className="font-mono text-xs uppercase max-w-[240px] leading-tight text-gray-500">
                Tip: Pasted text gives more accurate scores than PDF uploads
              </div>
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={status === AnalysisStatus.LOADING || inputText.length < 50}
                className="w-full md:w-auto text-xl px-8 py-5"
              >
                {status === AnalysisStatus.LOADING ? (
                  <span className="flex items-center gap-2 animate-pulse">PROCESSING...</span>
                ) : (
                  <>Run Text <ArrowRight className="ml-2 w-5 h-5" /></>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleChooseFile}
                disabled={status === AnalysisStatus.LOADING}
                className="w-full md:w-auto text-xl px-8 py-5"
              >
                Upload PDF
              </Button>
              <input ref={fileInputRef} onChange={handleFileChange} type="file" accept=".pdf" hidden />
            </div>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-50 border-2 border-red-600 flex items-start gap-3 text-red-600 font-mono text-sm shadow-[4px_4px_0px_0px_#DC2626]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-bold">ERROR: {error}</p>
            </div>
          )}
        </div>
      </section>

      {/* RESULTS SECTION */}
      {result && (
        <section ref={resultsRef} className="py-24 px-6 bg-[#FDFBF7] border-t-2 border-black min-h-screen">
          <div className="max-w-7xl mx-auto">

            <div className="flex flex-col lg:flex-row gap-12 mb-20">

              {/* Left Column: Score & Snapshot */}
              <div className="lg:w-1/3 flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start h-fit">
                {/* Score Card */}
                <Card className="flex flex-col items-center justify-center py-10 bg-white">
                  <h3 className="absolute top-4 left-4 font-mono text-xs font-bold uppercase text-gray-400">Vibe_Score</h3>
                  {result.name && result.name !== 'Unknown' && (
                    <div className="absolute top-4 right-4 font-mono text-xs font-bold uppercase text-black border-2 border-black px-2 py-1 bg-yellow-200">
                      {result.name}
                    </div>
                  )}
                  <div className="relative w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          stroke="black"
                          strokeWidth={3}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell - ${index} `} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-black">{result.score}</span>
                    </div>
                  </div>

                  <div className="mt-4 text-center px-4">
                    <div className="inline-block bg-black text-white px-4 py-1 font-bold text-lg uppercase transform -rotate-2">
                      {result.label}
                    </div>
                  </div>
                </Card>


                {/* Description Text */}
                <div className="p-6 border-l-4 border-black bg-white/50">
                  <p className="text-lg font-medium leading-tight">{result.description}</p>
                </div>

                {/* AI Variance Disclaimer */}
                <div className="px-4 py-3 bg-yellow-50 border-l-4 border-yellow-500 text-sm font-mono text-gray-700">
                  <span className="font-bold">⚠️ Note:</span> AI-generated scores may vary ±10 points and content changes with each analysis. This reflects how different recruiters might view your resume.
                </div>

                {/* Share Card Button */}
                <Button
                  onClick={() => setShowShareModal(true)}
                  className="w-full bg-[#FF4D00] text-white text-lg py-4 flex items-center justify-center gap-2"
                >
                  <Camera className="w-6 h-6" /> SHARE CARD
                </Button>

                {/* Export Resume */}
                <div className="border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000000]">
                  <h4 className="font-black text-lg uppercase mb-4">Export Resume</h4>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={handleDownloadImproved}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> DOWNLOAD HTML
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> DOWNLOAD PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="lg:w-2/3 flex flex-col gap-8">

                {/* Recruiter Snapshot */}
                <div className="border-2 border-black bg-[#FF4D00] text-white p-8 shadow-[8px_8px_0px_0px_#000000]">
                  <div className="flex items-center gap-2 mb-4 opacity-80">
                    <Quote className="w-8 h-8 fill-white stroke-none" />
                    <span className="font-mono text-sm font-bold uppercase tracking-wider">Recruiter's Inner Monologue</span>
                  </div>
                  <blockquote className="text-2xl md:text-3xl font-bold leading-tight italic">
                    "{result.recruiterSnapshot}"
                  </blockquote>
                </div>

                {/* Buzzword Heatmap */}
                {(result.greenFlags?.length || result.redFlags?.length) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Green Flags */}
                    {result.greenFlags && result.greenFlags.length > 0 && (
                      <div className="border-2 border-green-600 bg-green-50 p-6 shadow-[8px_8px_0px_0px_#16A34A]">
                        <h3 className="text-lg font-black uppercase text-green-700 mb-3 flex items-center gap-2">
                          <Check className="w-5 h-5" />
                          <span>Green Flags (Keep)</span>
                        </h3>
                        <p className="text-xs font-medium text-green-700 mb-3">
                          Strong, impactful phrases found in your resume
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.greenFlags.map((flag, idx) => (
                            <span key={idx} className="bg-white border-2 border-green-600 text-green-800 px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0px_0px_#16A34A]">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weak Phrases */}
                    {result.redFlags && result.redFlags.length > 0 && (
                      <div className="border-2 border-red-600 bg-red-50 p-6 shadow-[8px_8px_0px_0px_#DC2626]">
                        <h3 className="text-lg font-black uppercase text-red-700 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Weak Phrases (Improve)</span>
                        </h3>
                        <p className="text-xs font-medium text-red-700 mb-3">
                          Vague buzzwords that need stronger wording
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.redFlags.map((flag, idx) => (
                            <span key={idx} className="bg-white border-2 border-red-600 text-red-800 px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0px_0px_#DC2626]">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Job Gaps (JD Match) */}
                {result.missingKeywords && result.missingKeywords.length > 0 && (
                  <div className="border-2 border-orange-600 bg-orange-50 p-6 shadow-[8px_8px_0px_0px_#FF4D00]">
                    <h3 className="text-xl font-black uppercase text-orange-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6" />
                      <span>Job Gaps (JD Match)</span>
                    </h3>
                    <p className="text-sm font-medium text-orange-800 mb-4 border-l-4 border-orange-600 pl-3">
                      These skills/technologies are mentioned in the Job Description but are NOT found in your resume
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((k, idx) => (
                        <span key={idx} className="bg-white border-2 border-orange-600 text-orange-800 px-3 py-1 font-bold text-sm shadow-sm">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* The Roast Grid */}
                <div>
                  <div className="bg-black text-white px-6 py-3 mb-6 inline-block">
                    <h3 className="text-3xl font-black uppercase flex items-center gap-3">
                      <AlertTriangle className="w-7 h-7 stroke-[3px]" />
                      <span>The Roast</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.roasts.map((roast, idx) => (
                      <div key={idx} className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000000]">
                        <div className="flex justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-[#FF4D00]">ISSUE_0{idx + 1}</span>
                        </div>
                        <p className="font-medium">{roast}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                <div className="mt-8">
                  <div className="bg-green-600 text-white px-6 py-3 mb-6 inline-block">
                    <h3 className="text-3xl font-black uppercase flex items-center gap-3">
                      <Check className="w-7 h-7 stroke-[4px]" />
                      <span>Immediate Fixes</span>
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {result.improvements.map((imp, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-4 border-b-2 border-black/10 last:border-0 hover:bg-white transition-colors">
                        <div className="w-6 h-6 border-2 border-black flex items-center justify-center shrink-0 bg-[#000] text-white">
                          <span className="font-mono text-xs font-bold">{idx + 1}</span>
                        </div>
                        <p className="text-lg leading-snug">{imp}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section-wise Feedback */}
                {result.sections && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-black uppercase">Section Fixes</h3>
                      <div className="flex gap-2 flex-wrap">
                        {(result.sourceText || inputText) && (
                          <Button size="sm" onClick={() => setShowDiff(v => !v)}> {showDiff ? 'Hide' : 'Show'} Comparison</Button>
                        )}
                      </div>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex flex-wrap gap-1 mb-4 border-b-2 border-black">
                      {['summary', 'experience', 'projects', 'education', 'skills', 'certifications'].map((key) => {
                        const sec = (result.sections as Record<string, SectionFeedback>)?.[key];
                        const hasContent = sec && (sec.issues?.length || sec.suggested?.length);
                        return (
                          <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`px-4 py-2 font-bold text-sm uppercase transition-all ${activeSection === key
                              ? 'bg-black text-white'
                              : hasContent
                                ? 'bg-gray-100 hover:bg-gray-200 text-black'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                            disabled={!hasContent}
                          >
                            {key}
                            {hasContent && <span className="ml-1 text-[#FF4D00]">•</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Section Content */}
                    {(() => {
                      const val = (result.sections as Record<string, SectionFeedback>)?.[activeSection];
                      if (!val || (!val.issues?.length && !val.suggested?.length)) {
                        return (
                          <Card className="p-6 bg-white text-center text-gray-500">
                            No feedback available for this section.
                          </Card>
                        );
                      }
                      return (
                        <Card className="p-6 bg-white">
                          <h4 className="text-xl font-bold mb-4 border-b-2 border-[#FF4D00] pb-2 inline-block">
                            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                          </h4>

                          {val.issues?.length ? (
                            <div className="mb-5">
                              <div className="font-mono text-xs uppercase text-red-600 font-bold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span> Issues Found
                              </div>
                              <ul className="space-y-2">
                                {val.issues.map((i, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                                    <span className="text-red-500 mt-1">✗</span>
                                    <span>{i}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {val.suggested?.length ? (
                            <div>
                              <div className="font-mono text-xs uppercase text-green-600 font-bold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Suggested Rewrites
                              </div>
                              <div className="space-y-3">
                                {val.suggested.map((s, idx) => (
                                  <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-3 flex items-start justify-between gap-3">
                                    <span className="flex-1 text-gray-800">{s}</span>
                                    <CopyButton text={s} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </Card>
                      );
                    })()}
                  </div>
                )}



              </div>
            </div>
          </div>
        </section>
      )
      }

      {/* SHARE CARD MODAL */}
      {
        showShareModal && result && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 overflow-auto">
            <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000000] max-w-6xl w-full max-h-[90vh] overflow-auto">
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                  <h2 className="text-2xl font-black uppercase">Share Your Roast Card</h2>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-8 h-8 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Aspect Ratio Toggle */}
                  <div>
                    <label className="block font-mono text-xs font-bold uppercase mb-2">Aspect Ratio</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAspectRatio('1:1')}
                        className={`flex-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all ${aspectRatio === '1:1'
                          ? 'bg-black text-white'
                          : 'bg-white hover:bg-gray-100'
                          }`}
                      >
                        Square (1:1)
                      </button>
                      <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`flex-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all ${aspectRatio === '9:16'
                          ? 'bg-black text-white'
                          : 'bg-white hover:bg-gray-100'
                          }`}
                      >
                        Portrait (9:16)
                      </button>
                    </div>
                  </div>

                  {/* Mode Toggle */}
                  <div>
                    <label className="block font-mono text-xs font-bold uppercase mb-2">Card Mode</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCardMode('roast')}
                        className={`flex-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all ${cardMode === 'roast'
                          ? 'bg-[#FF4D00] text-white border-[#FF4D00]'
                          : 'bg-white hover:bg-orange-50'
                          }`}
                      >
                        Roast Mode
                      </button>
                      <button
                        onClick={() => setCardMode('clean')}
                        className={`flex-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all ${cardMode === 'clean'
                          ? 'bg-black text-white'
                          : 'bg-white hover:bg-gray-100'
                          }`}
                      >
                        Clean Mode
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mb-4">
                  <div className="flex justify-center bg-gray-100 p-4 border-2 border-black overflow-hidden h-[450px] items-center">
                    <div style={{
                      transform: `scale(${aspectRatio === '1:1' ? 0.45 : 0.38})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.3s ease'
                    }}>
                      <RoastCard
                        result={result}
                        aspectRatio={aspectRatio}
                        mode={cardMode}
                      />
                    </div>
                  </div>
                </div>

                {/* Hidden full-size card for download */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                  <div ref={cardRef}>
                    <RoastCard
                      result={result}
                      aspectRatio={aspectRatio}
                      mode={cardMode}
                    />
                  </div>
                </div>

                {/* Download Button */}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleDownloadShareCard}
                    className="text-xl px-12 py-5"
                  >
                    Download Card
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* BATTLE ZONE (The Interrogator) */}
      {result && result.interviewQuestions && result.interviewQuestions.length > 0 && (
        <section className="py-24 px-6 bg-black text-white border-t-2 border-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-16 justify-center">
              <Swords className="w-8 h-8 md:w-12 md:h-12 text-[#FF4D00]" />
              <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-center">
                Prepare For Battle
              </h2>
              <Swords className="w-8 h-8 md:w-12 md:h-12 text-[#FF4D00] transform scale-x-[-1]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {result.interviewQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="relative h-96 cursor-pointer group [perspective:1000px]"
                  onClick={() => setRevealedCard(revealedCard === idx ? null : idx)}
                >
                  {/* Card Inner */}
                  <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${revealedCard === idx ? '[transform:rotateY(180deg)]' : ''}`}>

                    {/* Front (Hidden) */}
                    <div className="absolute inset-0 [backface-visibility:hidden] bg-[#1a1a1a] border-2 border-white flex flex-col items-center justify-center p-8 shadow-[8px_8px_0px_0px_#FF4D00] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-active:translate-x-[4px] group-active:translate-y-[4px] transition-all">
                      <div className="text-[#FF4D00] font-mono font-bold text-xl mb-4">QUESTION 0{idx + 1}</div>
                      <h3 className="text-3xl font-black text-center uppercase leading-none">
                        REVEAL<br />CHALLENGE
                      </h3>
                      <p className="mt-6 text-gray-500 font-mono text-xs text-center border-t border-gray-700 pt-4 w-full">
                        CLICK TO FLIP
                      </p>
                    </div>

                    {/* Back (Revealed) */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white text-black border-2 border-[#FF4D00] flex flex-col p-8 shadow-[8px_8px_0px_0px_#FFF]">
                      <div className="font-mono text-xs font-bold text-gray-400 mb-4 uppercase">
                        Topic: Technical Deep Dive
                      </div>
                      <p className="text-xl font-bold leading-tight mb-auto font-mono">
                        "{q.question}"
                      </p>

                      {/* Hint Toggle */}
                      <div className="mt-6 border-t-2 border-gray-100 pt-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setRevealedHint(revealedHint === idx ? null : idx)}
                          className="text-xs font-mono font-bold text-[#FF4D00] hover:text-black transition-colors flex items-center gap-2"
                        >
                          {revealedHint === idx ? 'HIDE HINT' : 'REVEAL HINT'}
                        </button>
                        {revealedHint === idx && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded italic border-l-2 border-[#FF4D00] break-words">
                            {q.hint}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-12 border-t-2 border-black bg-black text-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center border-2 border-transparent">
              <span className="font-mono font-bold text-lg">R/</span>
            </div>
            <span className="font-bold text-xl tracking-tight">RESUVIBE</span>
          </div>
          <div className="text-center md:text-right font-mono text-xs text-gray-400">
            <p className="mb-2">AI ANALYSIS IS PROBABILISTIC, NOT DETERMINISTIC.</p>
            <p>&copy; {new Date().getFullYear()} VIBE CHECK PROTOCOL</p>
          </div>
        </div>
      </footer>
    </div >
  );
};

export default App;