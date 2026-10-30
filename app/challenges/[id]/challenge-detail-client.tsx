"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  SearchX,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trophy,
  WifiOff,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  Challenge,
  fetchChallenge,
  fetchAllChallenges,
  FALLBACK_CHALLENGES,
} from "@/lib/challenges";
import { SessionNavBar } from "@/app/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChallengeDetailClientProps {
  id: string;
}

export default function ChallengeDetailClient({ id: challengeId }: ChallengeDetailClientProps) {
  const router = useRouter();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>(FALLBACK_CHALLENGES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedExampleIndex, setCopiedExampleIndex] = useState<number | null>(null);
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [showChallengeDropdown, setShowChallengeDropdown] = useState<boolean>(false);

  // Load challenge data
  const loadData = async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      const [challengeResult, listResult] = await Promise.all([
        fetchChallenge(challengeId),
        fetchAllChallenges(),
      ]);

      setAllChallenges(listResult);

      if (challengeResult.isNotFound) {
        setIsNotFound(true);
        setChallenge(null);
      } else if (challengeResult.error) {
        setErrorMessage(challengeResult.error);
        setChallenge(null);
      } else {
        setChallenge(challengeResult.challenge);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while loading this challenge.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setRevealedHints({});
  }, [challengeId]);

  const handleCopyCode = () => {
    if (!challenge) return;
    navigator.clipboard.writeText(challenge.starter_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyId = () => {
    if (!challenge) return;
    navigator.clipboard.writeText(challenge.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyExample = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedExampleIndex(index);
    setTimeout(() => setCopiedExampleIndex(null), 2000);
  };

  const toggleHint = (index: number) => {
    setRevealedHints((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getDifficultyBadge = (difficulty: string) => {
    const diff = difficulty.toLowerCase();
    if (diff === "beginner") {
      return {
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        dotClass: "bg-emerald-400",
        label: "Beginner",
      };
    }
    if (diff === "easy") {
      return {
        badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        dotClass: "bg-sky-400",
        label: "Easy",
      };
    }
    if (diff === "medium") {
      return {
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dotClass: "bg-amber-400",
        label: "Medium",
      };
    }
    return {
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      dotClass: "bg-rose-400",
      label: difficulty || "Hard",
    };
  };

  return (
    <div className="flex min-h-screen w-full bg-[#050505] text-white">
      {/* App Sidebar */}
      <SessionNavBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full pl-[3.05rem] min-h-screen flex flex-col overflow-y-auto">
        {/* Top Header & Breadcrumbs Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/80 px-6 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/challenges"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>All Challenges</span>
            </Link>

            <span className="text-zinc-700">/</span>

            {challenge ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-300">
                  {challenge.title}
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                  {challenge.id}
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500">Challenge Detail</span>
            )}
          </div>

          {/* Quick Challenge Switcher & Start Practicing Button in Header */}
          <div className="flex items-center gap-3">
            {/* Quick Switch Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowChallengeDropdown(!showChallengeDropdown)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-zinc-800"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Switch Challenge</span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {showChallengeDropdown && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-xl border border-white/15 bg-zinc-950 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setShowChallengeDropdown(false)}
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    All 5 Challenges
                  </div>
                  <div className="flex flex-col gap-1">
                    {allChallenges.map((c) => {
                      const isCurrent = c.id === challengeId;
                      const diffInfo = getDifficultyBadge(c.difficulty);
                      return (
                        <Link
                          key={c.id}
                          href={`/challenges/${c.id}`}
                          onClick={() => setShowChallengeDropdown(false)}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition",
                            isCurrent
                              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{c.title}</span>
                            <span className="text-[10px] text-zinc-500">{c.topic}</span>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium border",
                              diffInfo.badgeClass
                            )}
                          >
                            {c.difficulty}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {challenge && (
              <Link
                href={`/workspace/${challenge.id}`}
                data-testid="header-start-practicing-btn"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start Practicing</span>
              </Link>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {/* ============================================================
              1. LOADING STATE
          ============================================================ */}
          {isLoading && (
            <div data-testid="challenge-loading-state" className="flex flex-col gap-8 animate-pulse">
              {/* Header Skeleton */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-24 rounded-full bg-zinc-800" />
                  <div className="h-6 w-28 rounded-full bg-zinc-800" />
                  <div className="h-6 w-20 rounded-full bg-zinc-800" />
                </div>
                <div className="h-10 w-3/5 rounded-lg bg-zinc-800" />
                <div className="h-4 w-1/3 rounded bg-zinc-800/60" />
              </div>

              {/* Grid Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left col */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Problem statement skeleton */}
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 flex flex-col gap-4">
                    <div className="h-5 w-40 rounded bg-zinc-800" />
                    <div className="h-4 w-full rounded bg-zinc-800/80" />
                    <div className="h-4 w-5/6 rounded bg-zinc-800/80" />
                    <div className="h-4 w-4/6 rounded bg-zinc-800/80" />
                  </div>

                  {/* Examples skeleton */}
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 flex flex-col gap-4">
                    <div className="h-5 w-32 rounded bg-zinc-800" />
                    <div className="h-20 w-full rounded-xl bg-zinc-800/60" />
                    <div className="h-20 w-full rounded-xl bg-zinc-800/60" />
                  </div>
                </div>

                {/* Right col */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Code skeleton */}
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-28 rounded bg-zinc-800" />
                      <div className="h-7 w-20 rounded bg-zinc-800" />
                    </div>
                    <div className="h-52 w-full rounded-xl bg-zinc-950/80 border border-white/5" />
                  </div>

                  {/* Button skeleton */}
                  <div className="h-14 w-full rounded-xl bg-zinc-800" />
                </div>
              </div>

              {/* Status footer banner */}
              <div className="flex items-center justify-center gap-3 py-6 text-sm text-zinc-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span>Connecting to GET /challenges/{challengeId}...</span>
              </div>
            </div>
          )}

          {/* ============================================================
              2. INVALID-ID STATE (404)
          ============================================================ */}
          {!isLoading && isNotFound && (
            <div
              data-testid="challenge-invalid-id-state"
              className="flex flex-col items-center justify-center py-12 px-4 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-rose-500/20 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/40 bg-zinc-900 text-rose-400 shadow-2xl">
                  <SearchX className="h-10 w-10" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 mb-3">
                <span>Invalid Challenge ID</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Challenge Not Found
              </h1>

              <p className="mt-3 max-w-xl text-sm text-zinc-400 leading-relaxed">
                We could not find any challenge matching ID{" "}
                <code className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-rose-300 border border-zinc-800">
                  {challengeId}
                </code>
                . Please select one of the five available challenges below:
              </p>

              {/* Suggestion Grid of All 5 Challenges */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl text-left">
                {allChallenges.map((c) => {
                  const diff = getDifficultyBadge(c.difficulty);
                  return (
                    <Link
                      key={c.id}
                      href={`/challenges/${c.id}`}
                      className="group flex flex-col justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-zinc-900 hover:shadow-xl hover:shadow-emerald-500/5"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              diff.badgeClass
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", diff.dotClass)} />
                            {c.difficulty}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {c.topic}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {c.title}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                          {c.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5 text-[11px] font-medium text-emerald-400">
                        <span>Open Challenge</span>
                        <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/challenges"
                  className="rounded-lg border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  Browse Catalog
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* ============================================================
              3. ERROR STATE
          ============================================================ */}
          {!isLoading && !isNotFound && errorMessage && (
            <div
              data-testid="challenge-error-state"
              className="flex flex-col items-center justify-center py-12 px-4 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/40 bg-zinc-900 text-amber-400 shadow-2xl">
                  <WifiOff className="h-10 w-10" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-3">
                <span>Connection Error</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Unable to Load Challenge
              </h1>

              <p className="mt-3 max-w-lg text-sm text-zinc-400 leading-relaxed">
                {errorMessage}
              </p>

              <div className="mt-6 flex items-center gap-4">
                <Button
                  onClick={loadData}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry Connection</span>
                </Button>
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* ============================================================
              4. SUCCESS STATE (CHALLENGE DETAILS)
          ============================================================ */}
          {!isLoading && !isNotFound && !errorMessage && challenge && (
            <div data-testid="challenge-detail-content" className="flex flex-col gap-8">
              {/* Challenge Hero Header */}
              <div className="flex flex-col gap-4 border-b border-white/10 pb-6">
                {/* Badges strip */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Difficulty */}
                  {(() => {
                    const diff = getDifficultyBadge(challenge.difficulty);
                    return (
                      <span
                        data-testid="challenge-difficulty-badge"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
                          diff.badgeClass
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", diff.dotClass)} />
                        {challenge.difficulty}
                      </span>
                    );
                  })()}

                  {/* Topic */}
                  <span
                    data-testid="challenge-topic-badge"
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300"
                  >
                    <Layers className="h-3 w-3" />
                    {challenge.topic}
                  </span>

                  {/* Subject */}
                  {challenge.subject && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
                      <Code2 className="h-3 w-3 text-emerald-400" />
                      {challenge.subject}
                    </span>
                  )}

                  {/* Category */}
                  {challenge.category && challenge.category !== challenge.topic && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-400">
                      {challenge.category}
                    </span>
                  )}

                  {/* ID Tag with Copy */}
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title="Click to copy challenge ID"
                    className="group inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-950 px-2.5 py-1 text-[11px] font-mono text-zinc-400 transition hover:border-white/20 hover:text-white"
                  >
                    <span>ID: {challenge.id}</span>
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                </div>

                {/* Challenge Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1
                      data-testid="challenge-title"
                      className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
                    >
                      {challenge.title}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                      Targeted algorithmic practice module with automated evaluation & Socratic AI guidance.
                    </p>
                  </div>

                  {/* Primary Start Practicing CTA Button */}
                  <Link
                    href={`/workspace/${challenge.id}`}
                    data-testid="start-practicing-btn"
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 hover:scale-[1.02] hover:shadow-emerald-500/40 active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start Practicing</span>
                  </Link>
                </div>
              </div>

              {/* Main Content Grid: 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ============================================================
                    LEFT COLUMN: Specs, Statement, Objectives, Examples, Constraints
                ============================================================ */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* 1. Problem Statement */}
                  <section
                    data-testid="challenge-problem-statement"
                    className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-md shadow-xl"
                  >
                    <div className="flex items-center gap-2.5 mb-4 text-emerald-400">
                      <BookOpen className="h-5 w-5" />
                      <h2 className="text-base font-bold uppercase tracking-wider text-white">
                        Problem Statement
                      </h2>
                    </div>

                    <div className="text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                      {challenge.description}
                    </div>
                  </section>

                  {/* 2. Learning Objectives */}
                  <section
                    data-testid="challenge-learning-objectives"
                    className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 via-zinc-900/40 to-zinc-900/60 p-6 backdrop-blur-md shadow-xl"
                  >
                    <div className="flex items-center gap-2.5 mb-4 text-indigo-400">
                      <GraduationCap className="h-5 w-5" />
                      <h2 className="text-base font-bold uppercase tracking-wider text-white">
                        Learning Objectives
                      </h2>
                    </div>

                    <p className="text-xs text-zinc-400 mb-3.5">
                      By completing this challenge, you will reinforce and demonstrate the following skills:
                    </p>

                    <ul className="flex flex-col gap-2.5">
                      {challenge.learning_objectives.map((objective, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/40 p-3 text-xs sm:text-sm text-zinc-200 transition hover:border-indigo-500/30"
                        >
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* 3. Input / Output Examples */}
                  <section
                    data-testid="challenge-examples"
                    className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-md shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5 text-sky-400">
                        <Terminal className="h-5 w-5" />
                        <h2 className="text-base font-bold uppercase tracking-wider text-white">
                          Examples
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">
                        {challenge.input_output_examples.length} test cases illustrated
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {challenge.input_output_examples.map((example, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-xl border border-white/10 bg-zinc-950/80 p-4 transition hover:border-white/20"
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                            <span className="text-xs font-semibold text-zinc-400">
                              Example {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyExample(
                                  `Input: ${example.input}\nOutput: ${example.output}`,
                                  idx
                                )
                              }
                              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition"
                            >
                              {copiedExampleIndex === idx ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex flex-col gap-2 font-mono text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5">
                              <span className="w-16 shrink-0 text-zinc-500 font-sans font-semibold">
                                Input:
                              </span>
                              <span className="rounded bg-black/60 px-2 py-1 text-emerald-300 border border-white/5 w-full break-all">
                                {example.input}
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5">
                              <span className="w-16 shrink-0 text-zinc-500 font-sans font-semibold">
                                Output:
                              </span>
                              <span className="rounded bg-black/60 px-2 py-1 text-sky-300 border border-white/5 w-full break-all">
                                {example.output}
                              </span>
                            </div>

                            {example.explanation && (
                              <div className="mt-2 pt-2 border-t border-white/5 font-sans text-xs text-zinc-400 italic">
                                <span className="font-semibold text-zinc-300 not-italic">
                                  Explanation:{" "}
                                </span>
                                {example.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 4. Constraints */}
                  <section
                    data-testid="challenge-constraints"
                    className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-md shadow-xl"
                  >
                    <div className="flex items-center gap-2.5 mb-4 text-amber-400">
                      <ShieldAlert className="h-5 w-5" />
                      <h2 className="text-base font-bold uppercase tracking-wider text-white">
                        Constraints
                      </h2>
                    </div>

                    <ul className="flex flex-col gap-2">
                      {challenge.constraints.map((constraint, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-zinc-950/60 px-3.5 py-2 font-mono text-xs text-zinc-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          <span>{constraint}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* 5. Progressive Hints Section */}
                  {challenge.hints && challenge.hints.length > 0 && (
                    <section
                      data-testid="challenge-hints"
                      className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-2.5 mb-4 text-yellow-400">
                        <Lightbulb className="h-5 w-5" />
                        <h2 className="text-base font-bold uppercase tracking-wider text-white">
                          Progressive Hints ({challenge.hints.length})
                        </h2>
                      </div>

                      <div className="flex flex-col gap-3">
                        {challenge.hints.map((hintText, idx) => {
                          const isRevealed = !!revealedHints[idx];
                          return (
                            <div
                              key={idx}
                              className="rounded-xl border border-white/10 bg-zinc-950/80 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => toggleHint(idx)}
                                className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-zinc-300 hover:text-white transition"
                              >
                                <span className="flex items-center gap-2">
                                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                                  <span>Hint {idx + 1}</span>
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  {isRevealed ? "Hide Hint" : "Reveal Hint"}
                                </span>
                              </button>

                              {isRevealed && (
                                <div className="border-t border-white/5 bg-zinc-900/60 p-3.5 text-xs text-zinc-300 leading-relaxed">
                                  {hintText}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>

                {/* ============================================================
                    RIGHT COLUMN: Starter Code, Practice CTA, Workspace Teaser
                ============================================================ */}
                <div className="lg:col-span-5 flex flex-col gap-6 sticky top-20">
                  {/* 1. Starter Code Box */}
                  <section
                    data-testid="challenge-starter-code"
                    className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden backdrop-blur-md shadow-2xl"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950/90 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="ml-2 text-xs font-mono font-medium text-zinc-300">
                          solution.py
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                          Python 3
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                          title="Copy Starter Code"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Code Display with Syntax Highlighting Emulation */}
                    <div className="p-4 bg-black/90 font-mono text-xs overflow-x-auto max-h-[380px] scrollbar-thin">
                      <pre className="text-zinc-300 leading-relaxed">
                        {challenge.starter_code.split("\n").map((line, idx) => {
                          const isDef = line.includes("def ");
                          const isDoc = line.includes('"""');
                          const isComment = line.trim().startsWith("#");
                          const isPass = line.trim() === "pass";

                          return (
                            <div key={idx} className="table-row">
                              <span className="table-cell pr-4 text-right select-none text-zinc-600 font-mono text-[11px] w-6">
                                {idx + 1}
                              </span>
                              <span
                                className={cn(
                                  "table-cell",
                                  isDef && "text-emerald-300 font-semibold",
                                  isDoc && "text-amber-300/80 italic",
                                  isComment && "text-zinc-500 italic",
                                  isPass && "text-rose-400 font-semibold"
                                )}
                              >
                                {line || " "}
                              </span>
                            </div>
                          );
                        })}
                      </pre>
                    </div>

                    <div className="border-t border-white/5 bg-zinc-950/80 px-4 py-2.5 text-[11px] text-zinc-500 flex items-center justify-between">
                      <span>Starter template for IDE</span>
                      <span>UTF-8</span>
                    </div>
                  </section>

                  {/* 2. Interactive Practice Card (CTA) */}
                  <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 via-zinc-900/60 to-zinc-950 p-6 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <Trophy className="h-4 w-4" />
                      <span>Ready to Solve?</span>
                    </div>

                    <h3 className="text-xl font-bold text-white">
                      Open Coding Workspace
                    </h3>

                    <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                      Launch the dedicated interactive code editor with test cases, real-time feedback, and Socratic AI hints.
                    </p>

                    <div className="mt-4 flex flex-col gap-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Instant Python evaluation engine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Socratic AI tutor ready to answer questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Earn 15 points toward your learning streak</span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Link
                        href={`/workspace/${challenge.id}`}
                        data-testid="workspace-cta-btn"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Start Practicing Now</span>
                      </Link>
                    </div>
                  </div>

                  {/* 3. Challenge Navigation footer */}
                  <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4 flex items-center justify-between text-xs text-zinc-400">
                    <Link
                      href="/challenges"
                      className="hover:text-white transition flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Browse Catalog</span>
                    </Link>

                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span>Difficulty:</span>
                      <span className="font-semibold text-emerald-400">
                        {challenge.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
