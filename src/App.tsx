import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Copy, RotateCcw, ChevronLeft, Check, History, Moon, Sun, Download, Trash2, PenTool } from "lucide-react";
import Markdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Step = 'brief' | 'loading' | 'script' | 'history';

interface ScriptBrief {
  niche: string;
  length: string;
  audience: string;
  language: string;
  goal: string;
  tone: string;
  includeVisualCues: boolean;
}

interface SavedScript {
  id: string;
  title: string;
  content: string;
  date: string;
  brief: ScriptBrief;
}

const LANGUAGES = ["English", "Spanish", "Hindi", "French", "German", "Portuguese", "Japanese", "Korean"];
const LENGTHS = ["< 60 seconds (Shorts/Reels)", "3-5 minutes (Standard)", "10+ minutes (Deep Dive)"];
const GOALS = ["Views & Retention", "Sales & Conversion", "Education & Value", "Entertainment & Story"];
const TONES = ["Conversational", "Authoritative", "Humorous", "Dramatic", "Minimalist", "High Energy", "Educational"];

export default function App() {
  const [step, setStep] = useState<Step>('brief');
  const [lastActiveStep, setLastActiveStep] = useState<Step>('brief');
  const [brief, setBrief] = useState<ScriptBrief>({
    niche: '',
    length: LENGTHS[0],
    audience: '',
    language: 'English',
    goal: GOALS[0],
    tone: TONES[0],
    includeVisualCues: true
  });
  const [script, setScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('Crafting Hook...');
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState<SavedScript[]>([]);

  // Track navigation to allow returning to active states
  const navigateTo = (newStep: Step) => {
    if (step !== 'history') {
      setLastActiveStep(step);
    }
    setStep(newStep);
  };

  // Load history and theme from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('narrative_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedTheme = localStorage.getItem('narrative_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Sync theme with DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('narrative_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('narrative_theme', 'light');
    }
  }, [darkMode]);

  // Sync history with localStorage
  useEffect(() => {
    localStorage.setItem('narrative_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (isGenerating) {
      const texts = [
        "Crafting Hook...",
        "Building Story...",
        "Refining CTA...",
        "Optimizing Retention...",
        "Polishing Narrative...",
        "Injecting Psychology...",
        "Finalizing Structure..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const generateScript = async () => {
    setIsGenerating(true);
    setStep('loading');
    try {
      const prompt = `
You are an expert video scriptwriter specializing in high-retention storytelling.
Your goal is to maximize Average View Duration (AVD).

RULES:
1. THE HOOK (0-5 seconds): Must be controversial, surprising, or highly relatable. No "Hello everyone". Start immediately with the value.
2. THE STORY (Body): Use the "Open Loop" technique. Introduce a question early, answer it at the end. Keep sentences short.
3. THE TONE: ${brief.tone}.
4. FORMATTING: ${brief.includeVisualCues ? "Use markers like [VISUAL CUE] where necessary." : "Do NOT include visual cues, only spoken text."} Use Markdown for bolding and sections.
5. LANGUAGE: Output strictly in ${brief.language}.

INPUT CONTEXT:
Niche: ${brief.niche || "General Interest"}
Length: ${brief.length}
Audience: ${brief.audience || "General Audience"}
Goal: ${brief.goal}

TASK:
Write a full script that forces the viewer to watch until the end. 
Include clear sections: **[HOOK]**, **[BODY]**, and **[CTA]**.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const generatedText = response.text || "Failed to generate script. Please try again.";
      setScript(generatedText);
      
      // Save to history
      const newScript: SavedScript = {
        id: Date.now().toString(),
        title: brief.niche || "Untitled Script",
        content: generatedText,
        date: new Date().toLocaleDateString(),
        brief: { ...brief }
      };
      setHistory(prev => [newScript, ...prev].slice(0, 20)); // Keep last 20
      
      setIsGenerating(false);
      setStep('script');
    } catch (error) {
      console.error("Generation error:", error);
      setScript("An error occurred while generating the script. Please check your connection and try again.");
      setIsGenerating(false);
      setStep('script');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([script], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `narrative-script-${(brief.niche || 'untitled').replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(s => s.id !== id));
  };

  const loadFromHistory = (saved: SavedScript) => {
    setBrief(saved.brief);
    setScript(saved.content);
    setIsGenerating(false);
    setStep('script');
  };

  const estimatedReadingTime = useMemo(() => {
    if (!script) return "0s";
    const words = script.trim().split(/\s+/).length;
    const minutes = words / 150; // Average speaking rate
    const seconds = Math.round(minutes * 60);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }, [script]);

  const reset = () => {
    setStep('brief');
    setScript('');
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] flex flex-col items-center px-6 py-12 md:py-24 transition-colors duration-300">
      <div className="w-full max-w-2xl">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-[#111111] dark:bg-[#EEEEEE] flex items-center justify-center rounded-sm">
              <PenTool className="text-white dark:text-[#111111] w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#EEEEEE] mb-0 leading-none">Narrative</h1>
              <p className="text-[#666666] dark:text-[#888888] text-[10px] uppercase tracking-widest mt-1">Scriptwriting Psychology</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {script && step !== 'script' && !isGenerating && (
              <button 
                onClick={() => setStep('script')}
                className="text-[10px] uppercase tracking-widest font-semibold text-[#111111] dark:text-[#EEEEEE] border-b border-[#111111] dark:border-[#EEEEEE] pb-0.5"
              >
                View Current
              </button>
            )}
            {isGenerating && step !== 'loading' && (
              <button 
                onClick={() => setStep('loading')}
                className="text-[10px] uppercase tracking-widest font-semibold text-amber-600 animate-pulse"
              >
                Generating...
              </button>
            )}
            <button 
              onClick={() => navigateTo(step === 'history' ? lastActiveStep : 'history')}
              className="p-2 hover:bg-[#F5F5F5] dark:hover:bg-[#111111] rounded-full transition-colors"
              title="History"
            >
              <History className={`w-5 h-5 ${step === 'history' ? 'text-[#111111] dark:text-[#EEEEEE]' : 'text-[#666666] dark:text-[#888888]'}`} />
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-[#F5F5F5] dark:hover:bg-[#111111] rounded-full transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-[#888888]" /> : <Moon className="w-5 h-5 text-[#666666]" />}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 'brief' && (
            <motion.div
              key="brief"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-[#666666] dark:text-[#888888]">Niche / Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Personal Finance, True Crime, Tech Reviews"
                    className="w-full border-b border-[#EEEEEE] dark:border-[#222222] py-3 focus:outline-none focus:border-[#111111] dark:focus:border-[#EEEEEE] transition-colors bg-transparent text-lg text-[#111111] dark:text-[#EEEEEE]"
                    value={brief.niche}
                    onChange={(e) => setBrief({ ...brief, niche: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-[#666666] dark:text-[#888888]">Video Length</label>
                    <select
                      className="w-full border-b border-[#EEEEEE] dark:border-[#222222] py-3 focus:outline-none focus:border-[#111111] dark:focus:border-[#EEEEEE] transition-colors bg-transparent appearance-none cursor-pointer text-[#111111] dark:text-[#EEEEEE]"
                      value={brief.length}
                      onChange={(e) => setBrief({ ...brief, length: e.target.value })}
                    >
                      {LENGTHS.map(l => <option key={l} value={l} className="bg-white dark:bg-[#111111]">{l}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-[#666666] dark:text-[#888888]">Tone</label>
                    <select
                      className="w-full border-b border-[#EEEEEE] dark:border-[#222222] py-3 focus:outline-none focus:border-[#111111] dark:focus:border-[#EEEEEE] transition-colors bg-transparent appearance-none cursor-pointer text-[#111111] dark:text-[#EEEEEE]"
                      value={brief.tone}
                      onChange={(e) => setBrief({ ...brief, tone: e.target.value })}
                    >
                      {TONES.map(t => <option key={t} value={t} className="bg-white dark:bg-[#111111]">{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-[#666666] dark:text-[#888888]">Language</label>
                    <select
                      className="w-full border-b border-[#EEEEEE] dark:border-[#222222] py-3 focus:outline-none focus:border-[#111111] dark:focus:border-[#EEEEEE] transition-colors bg-transparent appearance-none cursor-pointer text-[#111111] dark:text-[#EEEEEE]"
                      value={brief.language}
                      onChange={(e) => setBrief({ ...brief, language: e.target.value })}
                    >
                      {LANGUAGES.map(l => <option key={l} value={l} className="bg-white dark:bg-[#111111]">{l}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-[#666666] dark:text-[#888888]">Primary Goal</label>
                    <select
                      className="w-full border-b border-[#EEEEEE] dark:border-[#222222] py-3 focus:outline-none focus:border-[#111111] dark:focus:border-[#EEEEEE] transition-colors bg-transparent appearance-none cursor-pointer text-[#111111] dark:text-[#EEEEEE]"
                      value={brief.goal}
                      onChange={(e) => setBrief({ ...brief, goal: e.target.value })}
                    >
                      {GOALS.map(g => <option key={g} value={g} className="bg-white dark:bg-[#111111]">{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-[#666666] dark:text-[#888888]">Target Audience</label>
                  <input
                    type="text"
                    placeholder="e.g. Beginners, Experts, Busy Parents"
                    className="w-full border-b border-[#EEEEEE] dark:border-[#222222] py-3 focus:outline-none focus:border-[#111111] dark:focus:border-[#EEEEEE] transition-colors bg-transparent text-[#111111] dark:text-[#EEEEEE]"
                    value={brief.audience}
                    onChange={(e) => setBrief({ ...brief, audience: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <input 
                    type="checkbox" 
                    id="visualCues"
                    className="w-4 h-4 accent-[#111111] dark:accent-[#EEEEEE] cursor-pointer"
                    checked={brief.includeVisualCues}
                    onChange={(e) => setBrief({ ...brief, includeVisualCues: e.target.checked })}
                  />
                  <label htmlFor="visualCues" className="text-sm text-[#666666] dark:text-[#888888] cursor-pointer">Include Visual Cues (e.g. [B-Roll of city])</label>
                </div>
              </div>

              <button
                onClick={generateScript}
                className="w-full bg-[#111111] dark:bg-[#EEEEEE] text-white dark:text-[#111111] py-4 font-medium tracking-tight hover:bg-black dark:hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Generate Script
              </button>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 space-y-6"
            >
              <div className="w-12 h-[1px] bg-[#EEEEEE] dark:bg-[#222222] overflow-hidden">
                <motion.div
                  className="h-full bg-[#111111] dark:bg-[#EEEEEE]"
                  animate={{ x: [-48, 48] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
              <p className="text-[#666666] dark:text-[#888888] text-sm animate-pulse">{loadingText}</p>
            </motion.div>
          )}

          {step === 'script' && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setStep('brief')}
                  className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#888888] hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Brief
                </button>
                <div className="flex space-x-4">
                  <div className="hidden md:flex items-center text-[10px] uppercase tracking-widest text-[#999999] mr-4">
                    Est. Time: {estimatedReadingTime}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#888888] hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadScript}
                    className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#888888] hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </button>
                  <button
                    onClick={generateScript}
                    className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#888888] hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0A0A0A] border border-[#EEEEEE] dark:border-[#222222] p-8 md:p-12 min-h-[400px] shadow-sm transition-colors">
                <div className="markdown-body">
                  <Markdown>{script}</Markdown>
                </div>
              </div>

              <div className="pt-8 border-t border-[#EEEEEE] dark:border-[#222222]">
                <p className="text-[10px] text-[#999999] dark:text-[#555555] uppercase tracking-widest text-center">
                  AI can make mistakes. Verify facts before filming.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setStep(lastActiveStep)}
                  className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#666666] dark:text-[#888888] hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111111] dark:text-[#EEEEEE]">Recent Scripts</h2>
              </div>

              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="py-12 text-center text-[#666666] dark:text-[#888888] text-sm">
                    No scripts saved yet.
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="group bg-white dark:bg-[#0A0A0A] border border-[#EEEEEE] dark:border-[#222222] p-6 cursor-pointer hover:border-[#111111] dark:hover:border-[#EEEEEE] transition-all flex justify-between items-center"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-[#111111] dark:text-[#EEEEEE] mb-1">{item.title}</h3>
                        <p className="text-[10px] text-[#666666] dark:text-[#888888] uppercase tracking-widest">{item.date} • {item.brief.tone}</p>
                      </div>
                      <button 
                        onClick={(e) => deleteFromHistory(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-24 pt-8 border-t border-[#EEEEEE] dark:border-[#222222] flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <p className="text-[10px] text-[#999999] dark:text-[#555555] uppercase tracking-widest">
            © {new Date().getFullYear()} Narrative. All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            <a href="#" className="text-[10px] text-[#999999] dark:text-[#555555] uppercase tracking-widest hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors">Privacy</a>
            <a href="#" className="text-[10px] text-[#999999] dark:text-[#555555] uppercase tracking-widest hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors">Terms</a>
            <a href="#" className="text-[10px] text-[#999999] dark:text-[#555555] uppercase tracking-widest hover:text-[#111111] dark:hover:text-[#EEEEEE] transition-colors">Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
