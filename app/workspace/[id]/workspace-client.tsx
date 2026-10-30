"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Code2,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Terminal,
  XCircle,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";
import { Challenge, fetchChallenge } from "@/lib/challenges";
import { SessionNavBar } from "@/app/page";
import { Button } from "@/components/ui/button";
import { TutorChatPanel } from "@/components/tutor-chat-panel";
import { cn } from "@/lib/utils";

interface WorkspaceClientProps {
  id: string;
}

type MobileTab = "problem" | "editor" | "tutor";

export default function WorkspaceClient({ id }: WorkspaceClientProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [code, setCode] = useState<string>("");

  // Responsive panel visibility on desktop
  const [showProblemPanel, setShowProblemPanel] = useState<boolean>(true);
  const [showTutorPanel, setShowTutorPanel] = useState<boolean>(true);

  // Mobile active tab
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("editor");

  // Problem tab internally (Statement vs Hints)
  const [problemTab, setProblemTab] = useState<"statement" | "hints">("statement");

  // Execution & Submission state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    passed: boolean;
    message: string;
    points: number;
    testResults?: any[];
  } | null>(null);

  // Progressive hints state
  const [hintTier, setHintTier] = useState<number>(1);
  const [hintContent, setHintContent] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await fetchChallenge(id);
      if (res.challenge) {
        setChallenge(res.challenge);
        setCode(res.challenge.starter_code);
      }
      setIsLoading(false);
    }
    load();
  }, [id]);

  const handleResetCode = () => {
    if (challenge) {
      setCode(challenge.starter_code);
      setSubmissionResult(null);
    }
  };

  const handleRunPublicTests = async () => {
    if (!challenge) return;
    setIsRunning(true);
    setSubmissionResult(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${backendUrl}/challenges/${challenge.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "learner_workspace_user",
          code: code,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionResult({
          passed: data.passed,
          message: data.message,
          points: data.points_earned,
          testResults: data.test_results,
        });
      } else {
        setSubmissionResult({
          passed: false,
          message: "Code executed. Review function syntax and return values.",
          points: 0,
        });
      }
    } catch (err) {
      setSubmissionResult({
        passed: false,
        message: "Simulation: Code submitted. Connect backend for full evaluation.",
        points: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRequestHint = async (tier: number) => {
    setIsLoadingHint(true);
    setHintTier(tier);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${backendUrl}/hints/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: id,
          student_code: code,
          hint_level: tier,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHintContent(data.hint);
      } else {
        const fallbackHint = challenge?.hints?.[tier - 1] || "Review your base cases and pointers.";
        setHintContent(fallbackHint);
      }
    } catch {
      const fallbackHint = challenge?.hints?.[tier - 1] || "Review your base cases and pointers.";
      setHintContent(fallbackHint);
    } finally {
      setIsLoadingHint(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="text-sm text-zinc-400 font-mono">Loading Coding Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#05070e] text-white">
      <SessionNavBar />

      <main className="flex-1 w-full pl-[3.05rem] min-h-screen flex flex-col">
        {/* ============================================================
            WORKSPACE HEADER
        ============================================================ */}
        <header className="flex h-12 items-center justify-between border-b border-white/10 bg-[#090d1a] px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/challenges/${id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Challenge Detail</span>
            </Link>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-none">
              {challenge?.title || "Coding Workspace"}
            </span>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              {challenge?.difficulty || "Beginner"}
            </span>
          </div>

          {/* Desktop Panel Toggles & Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Toggles */}
            <div className="hidden lg:flex items-center gap-1 border-r border-white/10 pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProblemPanel(!showProblemPanel)}
                className={cn(
                  "h-7 text-xs gap-1.5",
                  showProblemPanel ? "text-zinc-300" : "text-zinc-500"
                )}
                title="Toggle Problem Panel"
              >
                {showProblemPanel ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
                <span>Specs</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTutorPanel(!showTutorPanel)}
                className={cn(
                  "h-7 text-xs gap-1.5",
                  showTutorPanel ? "text-indigo-300 font-semibold" : "text-zinc-500"
                )}
                title="Toggle Socratic AI Tutor Panel"
              >
                {showTutorPanel ? <PanelRightClose className="h-3.5 w-3.5 text-indigo-400" /> : <PanelRightOpen className="h-3.5 w-3.5 text-indigo-400" />}
                <span>AI Tutor</span>
              </Button>
            </div>

            {/* Mobile / Tablet Tab Switcher */}
            <div className="flex lg:hidden items-center bg-zinc-900 rounded-lg p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveMobileTab("problem")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition font-medium",
                  activeMobileTab === "problem" ? "bg-zinc-800 text-white" : "text-zinc-400"
                )}
              >
                Problem
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("editor")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition font-medium",
                  activeMobileTab === "editor" ? "bg-zinc-800 text-white" : "text-zinc-400"
                )}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("tutor")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition font-medium flex items-center gap-1",
                  activeMobileTab === "tutor" ? "bg-indigo-600 text-white font-bold" : "text-indigo-400"
                )}
              >
                <Bot className="h-3 w-3" />
                <span>Tutor</span>
              </button>
            </div>

            {/* Reset Code */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCode}
              className="h-7 text-xs border-white/10 hover:bg-zinc-800"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Reset</span>
            </Button>

            {/* Run Tests */}
            <Button
              size="sm"
              onClick={handleRunPublicTests}
              disabled={isRunning}
              className="h-7 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-md shadow-emerald-500/20"
            >
              {isRunning ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1 fill-current" />
              )}
              Run Tests
            </Button>
          </div>
        </header>

        {/* ============================================================
            WORKSPACE BODY: RESPONSIVE 3-COLUMN LAYOUT
        ============================================================ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-3rem)]">
          {/* ============================================================
              LEFT PANEL: PROBLEM STATEMENT & HINTS
          ============================================================ */}
          <div
            className={cn(
              "border-r border-white/10 bg-[#070a14] flex flex-col h-full overflow-hidden transition-all duration-200",
              // Desktop responsive width
              showProblemPanel && showTutorPanel
                ? "lg:col-span-3 xl:col-span-3"
                : showProblemPanel && !showTutorPanel
                ? "lg:col-span-5 xl:col-span-4"
                : "lg:hidden",
              // Mobile tab visibility
              activeMobileTab === "problem" ? "flex" : "hidden lg:flex"
            )}
          >
            {/* Panel Tabs */}
            <div className="flex border-b border-white/10 bg-zinc-950 px-2 shrink-0">
              <button
                type="button"
                onClick={() => setProblemTab("statement")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition",
                  problemTab === "statement"
                    ? "border-emerald-400 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                )}
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                Problem
              </button>

              <button
                type="button"
                onClick={() => setProblemTab("hints")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition",
                  problemTab === "hints"
                    ? "border-yellow-400 text-yellow-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                Hints
              </button>
            </div>

            {/* Problem Statement Content */}
            {problemTab === "statement" && challenge && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs scrollbar-thin">
                <div>
                  <h2 className="text-base font-bold text-white mb-1.5">{challenge.title}</h2>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs">
                    {challenge.description}
                  </p>
                </div>

                {/* Examples */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Examples
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {challenge.input_output_examples.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/10 bg-zinc-950/80 p-2.5 font-mono text-[11px]"
                      >
                        <div className="text-zinc-400">
                          Input: <span className="text-emerald-300">{ex.input}</span>
                        </div>
                        <div className="text-zinc-400 mt-1">
                          Output: <span className="text-sky-300">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="text-zinc-500 font-sans text-[10px] mt-1 italic">
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Constraints
                  </h3>
                  <ul className="flex flex-col gap-1 font-mono text-[11px] text-zinc-300">
                    {challenge.constraints.map((c, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-amber-400" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Hints Tab Content */}
            {problemTab === "hints" && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
                <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4" />
                  <span>Socratic Hint Levels</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestHint(1)}
                    className={cn(
                      "text-[10px] h-7 px-1 border-white/10",
                      hintTier === 1 && "border-yellow-400 text-yellow-300 font-bold"
                    )}
                  >
                    Tier 1 (Nudge)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestHint(2)}
                    className={cn(
                      "text-[10px] h-7 px-1 border-white/10",
                      hintTier === 2 && "border-yellow-400 text-yellow-300 font-bold"
                    )}
                  >
                    Tier 2 (Strategy)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestHint(3)}
                    className={cn(
                      "text-[10px] h-7 px-1 border-white/10",
                      hintTier === 3 && "border-yellow-400 text-yellow-300 font-bold"
                    )}
                  >
                    Tier 3 (Blueprint)
                  </Button>
                </div>

                {isLoadingHint ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 py-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Consulting hint engine...</span>
                  </div>
                ) : hintContent ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 text-xs text-yellow-200/90 leading-relaxed">
                    <div className="font-bold text-yellow-300 mb-1">Tier {hintTier} Hint:</div>
                    {hintContent}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Select a tier above to reveal a hint without spoiling the full solution.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ============================================================
              CENTER PANEL: CODE EDITOR & TEST EXECUTION CONSOLE
          ============================================================ */}
          <div
            className={cn(
              "flex flex-col h-full bg-[#080b16] border-r border-white/10 overflow-hidden transition-all duration-200",
              // Desktop responsive width
              showProblemPanel && showTutorPanel
                ? "lg:col-span-5 xl:col-span-5"
                : !showProblemPanel && showTutorPanel
                ? "lg:col-span-7 xl:col-span-7"
                : showProblemPanel && !showTutorPanel
                ? "lg:col-span-7 xl:col-span-8"
                : "lg:col-span-12",
              // Mobile tab visibility
              activeMobileTab === "editor" ? "flex" : "hidden lg:flex"
            )}
          >
            {/* Editor File Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#090d1a] px-4 py-2 text-xs font-mono text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-zinc-200">solution.py</span>
              </div>
              <span className="text-[11px] text-zinc-500">Python 3.11</span>
            </div>

            {/* Code Editor Textarea */}
            <div className="flex-1 relative overflow-hidden bg-[#070912]">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                data-testid="code-editor-textarea"
                className="w-full h-full resize-none bg-transparent p-4 font-mono text-xs sm:text-[13px] text-emerald-300 focus:outline-none leading-relaxed selection:bg-emerald-500/30 scrollbar-thin"
              />
            </div>

            {/* Test Results / Execution Console */}
            <div className="h-44 bg-black/90 p-4 font-mono text-xs overflow-y-auto border-t border-white/10 shrink-0 scrollbar-thin">
              <div className="flex items-center gap-2 text-zinc-400 mb-2 border-b border-white/5 pb-1">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Test Execution Console
                </span>
              </div>

              {isRunning ? (
                <div className="flex items-center gap-2 text-zinc-400 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span>Executing code against test runner...</span>
                </div>
              ) : submissionResult ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {submissionResult.passed ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        PASSED — All test cases succeeded! (+{submissionResult.points} XP)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold">
                        <XCircle className="h-4 w-4" />
                        FAILED — {submissionResult.message}
                      </span>
                    )}
                  </div>
                  {submissionResult.testResults && (
                    <div className="text-zinc-400 text-[11px] bg-zinc-950 p-2 rounded border border-white/5">
                      <pre>{JSON.stringify(submissionResult.testResults, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-zinc-600 italic py-2">
                  Click &quot;Run Tests&quot; in the header to evaluate your solution.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
              RIGHT PANEL: SOCRATIC AI TUTOR (PERMANENT / ACCESSIBLE PANEL)
          ============================================================ */}
          <div
            className={cn(
              "flex flex-col h-full overflow-hidden transition-all duration-200",
              // Desktop responsive width
              showProblemPanel && showTutorPanel
                ? "lg:col-span-4 xl:col-span-4"
                : !showProblemPanel && showTutorPanel
                ? "lg:col-span-5 xl:col-span-5"
                : "lg:hidden",
              // Mobile tab visibility
              activeMobileTab === "tutor" ? "flex" : "hidden lg:flex"
            )}
          >
            <TutorChatPanel
              challengeId={id}
              challengeTitle={challenge?.title}
              problemStatement={challenge?.description}
              currentCode={code}
              className="h-full border-none"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
