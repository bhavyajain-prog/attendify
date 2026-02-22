"use client";

import { useState, useCallback } from "react";
import { parseAttendanceData, type ParseResult } from "@/lib/parser";
import Dashboard from "@/components/Dashboard";
import { ClipboardPaste, FileText, AlertCircle, Sparkles } from "lucide-react";

export default function Home() {
  const [rawText, setRawText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [pasting, setPasting] = useState(false);

  const processText = useCallback((text: string) => {
    setError("");
    const result = parseAttendanceData(text);
    if (result.subjects.length === 0) {
      setError(
        "Could not parse any attendance data. Make sure you paste the full table — either the summary or the detailed class-by-class format.",
      );
      return;
    }
    setParseResult(result);
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    setPasting(true);
    setError("");
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Clipboard is empty. Copy the attendance table first.");
        setPasting(false);
        return;
      }
      setRawText(text);
      processText(text);
    } catch {
      setError(
        "Could not read clipboard. Please allow clipboard permissions or paste manually below.",
      );
    }
    setPasting(false);
  }, [processText]);

  const handleAnalyze = useCallback(() => {
    if (!rawText.trim()) {
      setError("Please paste your attendance data first.");
      return;
    }
    processText(rawText);
  }, [rawText, processText]);

  const handleReset = useCallback(() => {
    setParseResult(null);
    setRawText("");
    setError("");
  }, []);

  if (parseResult) {
    return <Dashboard parseResult={parseResult} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Sparkles size={12} />
            Attendance Analytics
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Attendify
          </h1>
          <p className="text-zinc-400 max-w-md mx-auto">
            Paste your attendance report — summary or detailed — and get instant
            visual analytics with actionable insights.
          </p>
        </div>

        {/* Clipboard Button */}
        <div className="flex justify-center">
          <button
            onClick={handlePasteFromClipboard}
            disabled={pasting}
            className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-lg shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:scale-105 active:scale-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardPaste
              size={22}
              className={pasting ? "animate-pulse" : ""}
            />
            {pasting ? "Reading clipboard..." : "Paste from Clipboard"}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-500 text-sm">or paste manually</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setError("");
            }}
            onPaste={(e) => {
              setTimeout(() => {
                const target = e.target as HTMLTextAreaElement;
                if (target.value.trim()) processText(target.value);
              }, 50);
            }}
            placeholder={`Paste your attendance table here...\n\nSupports both formats:\n• Summary: # Code Subject Type Present OD Makeup Absent %\n• Detailed: # Code Subject Type Faculty Date Time Hours P/A/OD`}
            className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
          />
          <div className="absolute top-3 right-3">
            <FileText size={16} className="text-zinc-700" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!rawText.trim()}
          className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-all cursor-pointer"
        >
          Analyze Attendance
        </button>

        {/* Footer hint */}
        <p className="text-center text-zinc-600 text-xs">
          Your data stays local — nothing is sent to any server.
        </p>
      </div>
    </div>
  );
}
