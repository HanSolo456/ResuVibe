import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Play, Github, AlertTriangle, Terminal, Quote, Check, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { analyzeResume, analyzeResumeFile } from './services/geminiService';
import { ResumeAnalysis, AnalysisStatus, SectionFeedback } from './types';
import { Button } from './components/Button';
import { Card } from './components/Card';

const SAMPLE_RESUME = `Software Engineer with 2 years of experience.
- Worked on multiple projects using React and Node.js.
- Helped the team deliver features on time.
- Good at communication and teamwork.
- Graduated from Tech University with a degree in Computer Science.
- Skills: Java, Python, C++, JavaScript, HTML, CSS, React, Angular, Vue, SQL, NoSQL, MongoDB, Postgres, AWS, Docker, Kubernetes, Git, Jira.`;

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('summary');

  useEffect(() => {
    if (showDiff) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDiff]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    
    try {
      const data = await analyzeResume(inputText);
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
        const data = await analyzeResumeFile(file);
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
    const sectionKeys = ['summary','experience','projects','education','skills','certifications'];
    const sectionHtml = sectionKeys.map(k => {
      const sf = sec(k);
      if (!sf.suggested?.length) return '';
      const title = k.charAt(0).toUpperCase() + k.slice(1);
      const sugg = (sf.suggested || []).map((x: string) => `<li style="margin-bottom:8px;">${x}</li>`).join('');
      return `<section style="margin:24px 0;">
        <h2 style="margin:0 0 12px 0; font-size:20px; border-bottom:2px solid #000; padding-bottom:4px;">${title}</h2>
        <ul style="margin:0; padding-left:20px;">${sugg}</ul>
      </section>`;
    }).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Improved Resume</title><style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.6;padding:40px;max-width:800px;margin:0 auto;}h1{margin-top:0;border-bottom:4px solid #FF4D00;padding-bottom:8px;}p{margin:16px 0;}</style></head><body>
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
    a.download = (result.name ? result.name.replace(/\s+/g,'_') : 'improved_resume') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      const sectionKeys = ['summary','experience','projects','education','skills','certifications'];
      
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
      
      doc.save((result.name ? result.name.replace(/\s+/g,'_') : 'improved_resume') + '.pdf');
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
    <div className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-[#FF4D00] selection:text-white">
      
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
                        return `<div style="margin-bottom:20px;"><strong style="font-size:16px;color:#059669;">${title}</strong><ul style="margin:8px 0 0 0; padding-left:20px; line-height:1.6;">${v.suggested.map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('')}</ul></div>`;
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
              href="https://github.com" 
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
              Resume <br/>
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

          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="hidden md:flex items-center gap-4">
                <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-white shadow-[4px_4px_0px_0px_#000]">
                   <Sparkles className="w-6 h-6 text-black" />
                </div>
                <div className="font-mono text-xs uppercase max-w-[200px] leading-tight text-gray-500">
                   System analyzes tone, impact verbs, and cliché density.
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
                Upload Resume
              </Button>
              <input ref={fileInputRef} onChange={handleFileChange} type="file" accept=".pdf,.docx,.txt" hidden />
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
            
            <div className="flex flex-col lg:flex-row gap-8 mb-16">
              
              {/* Left Column: Score & Snapshot */}
              <div className="lg:w-1/3 flex flex-col gap-8">
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
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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

                {/* The Roast Grid */}
                <div>
                   <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                     <AlertTriangle className="w-6 h-6 stroke-[3px]" />
                     <span>The Roast</span>
                   </h3>
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
                   <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                     <Check className="w-6 h-6 stroke-[4px]" />
                     <span>Immediate Fixes</span>
                   </h3>
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
                        <Button size="sm" variant="outline" onClick={handleDownloadImproved}>Download HTML</Button>
                        <Button size="sm" variant="outline" onClick={handleDownloadPDF}>Download PDF</Button>
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
                            className={`px-4 py-2 font-bold text-sm uppercase transition-all ${
                              activeSection === key 
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
                                    <Button 
                                      size="sm" 
                                      className="px-2 py-1 text-xs shrink-0" 
                                      variant="outline" 
                                      onClick={() => navigator.clipboard.writeText(s)}
                                    >
                                      Copy
                                    </Button>
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
      )}

      {/* FOOTER */}
      <footer className="py-12 border-t-2 border-black bg-black text-white">
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

    </div>
  );
};

export default App;