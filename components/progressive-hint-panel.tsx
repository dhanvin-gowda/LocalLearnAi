"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Lock,
  Unlock,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Loader2,
  Languages,
  Compass,
  ArrowRight,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HintData {
  level: number;
  hint: string;
  next_action: string;
  language: string;
}

interface ProgressiveHintPanelProps {
  challengeId: string;
  challengeTitle: string;
  code: string;
  onCodeInsert?: (snippet: string) => void;
  className?: string;
}

const TIER_METADATA = [
  {
    level: 1,
    title: "Level 1: Conceptual Clue",
    subtitle: "Core programming concept & subtle hint without revealing the algorithm",
    tag: "Concept",
    accentColor: "from-amber-500/20 via-amber-500/10 to-transparent",
    borderActive: "border-amber-500/40",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    buttonGradient: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30",
    icon: Compass,
  },
  {
    level: 2,
    title: "Level 2: Problem-Solving Approach",
    subtitle: "Systematic strategy, relevant Python tools & data structure suggestions",
    tag: "Strategy",
    accentColor: "from-sky-500/20 via-sky-500/10 to-transparent",
    borderActive: "border-sky-500/40",
    badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    buttonGradient: "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30",
    icon: Sparkles,
  },
  {
    level: 3,
    title: "Level 3: Detailed Guidance & Blueprint",
    subtitle: "Step-by-step algorithm, pseudocode structure & critical edge cases",
    tag: "Blueprint",
    accentColor: "from-purple-500/20 via-purple-500/10 to-transparent",
    borderActive: "border-purple-500/40",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    buttonGradient: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30",
    icon: Code2,
  },
];

export function ProgressiveHintPanel({
  challengeId,
  challengeTitle,
  code,
  className,
}: ProgressiveHintPanelProps) {
  // Multilingual preference (synchronized with local storage and tutor)
  const [language, setLanguage] = useState<"en" | "kn" | "hi">("en");

  // Per-tier hint contents: key is tier number (1, 2, 3)
  const [revealedHints, setRevealedHints] = useState<Record<number, HintData>>({});

  // Loading state per tier
  const [loadingTier, setLoadingTier] = useState<number | null>(null);

  // Error state per tier
  const [errorTier, setErrorTier] = useState<Record<number, string | null>>({});

  // Copied indicator per tier
  const [copiedTier, setCopiedTier] = useState<number | null>(null);

  // Load language preference and saved hints from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("locallearn_tutor_lang") as "en" | "kn" | "hi" | null;
      if (savedLang && ["en", "kn", "hi"].includes(savedLang)) {
        setLanguage(savedLang);
      }

      const storageKey = `locallearn_hints_${challengeId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setRevealedHints(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load hints from localStorage:", e);
    }
  }, [challengeId]);

  // Persist language changes
  const handleLanguageChange = (newLang: "en" | "kn" | "hi") => {
    setLanguage(newLang);
    try {
      localStorage.setItem("locallearn_tutor_lang", newLang);
    } catch (e) {
      console.warn("Failed to persist language:", e);
    }
  };

  // Persist revealed hints to localStorage
  const persistHints = (hintsMap: Record<number, HintData>) => {
    try {
      const storageKey = `locallearn_hints_${challengeId}`;
      localStorage.setItem(storageKey, JSON.stringify(hintsMap));
    } catch (e) {
      console.warn("Could not save hints to localStorage:", e);
    }
  };

  // Request a progressive hint from Next.js proxy -> FastAPI
  const requestHint = async (tier: number) => {
    setLoadingTier(tier);
    setErrorTier((prev) => ({ ...prev, [tier]: null }));

    try {
      // Collect previously revealed hints for context continuity
      const prevHintsList: string[] = [];
      for (let i = 1; i < tier; i++) {
        if (revealedHints[i]?.hint) {
          prevHintsList.push(revealedHints[i].hint);
        }
      }

      const res = await fetch("/api/hints/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          code: code || "",
          level: tier,
          language: language,
          previous_hints: prevHintsList,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detail || `Failed to generate Hint ${tier} (${res.status})`);
      }

      const data = await res.json();
      const newHints = {
        ...revealedHints,
        [tier]: {
          level: tier,
          hint: data.hint || "Review the problem statement and inspect variable constraints.",
          next_action: data.next_action || "Apply this insight in your code editor.",
          language: data.language || language,
        },
      };

      setRevealedHints(newHints);
      persistHints(newHints);
    } catch (err: any) {
      console.error(`Error requesting hint tier ${tier}:`, err);
      setErrorTier((prev) => ({
        ...prev,
        [tier]: err.message || "Failed to reach AI hint engine. Please retry.",
      }));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleCopyHint = async (tier: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTier(tier);
      setTimeout(() => setCopiedTier(null), 2000);
    } catch (e) {
      console.warn("Failed to copy hint:", e);
    }
  };

  const handleResetHints = () => {
    setRevealedHints({});
    setErrorTier({});
    try {
      localStorage.removeItem(`locallearn_hints_${challengeId}`);
    } catch (e) {
      console.warn("Failed to clear hints from localStorage:", e);
    }
  };

  const unlockedCount = Object.keys(revealedHints).length;

  return (
    <div className={cn("flex flex-col h-full bg-slate-950/70 text-slate-200 overflow-hidden", className)}>
      {/* Header Bar */}
      <div className="shrink-0 p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Progressive AI Hints
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {challengeTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language dropdown */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-xs">
              <Languages className="h-3 w-3 text-slate-400 ml-1.5 mr-0.5" />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as "en" | "kn" | "hi")}
                className="bg-transparent text-[11px] font-medium text-slate-300 focus:outline-none cursor-pointer py-0.5 pr-1.5"
                title="Select Hint Language"
              >
                <option value="en" className="bg-slate-900 text-white">English</option>
                <option value="kn" className="bg-slate-900 text-white">ಕನ್ನಡ</option>
                <option value="hi" className="bg-slate-900 text-white">हिन्दी</option>
              </select>
            </div>

            {unlockedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetHints}
                className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Reset revealed hints"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Unlocked Progress Bar */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 grid grid-cols-3 gap-1.5 h-1.5">
            {[1, 2, 3].map((t) => (
              <div
                key={t}
                className={cn(
                  "rounded-full transition-all duration-300",
                  revealedHints[t]
                    ? t === 1
                      ? "bg-amber-400"
                      : t === 2
                      ? "bg-sky-400"
                      : "bg-purple-400"
                    : "bg-slate-800"
                )}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
            {unlockedCount} of 3 Unlocked
          </span>
        </div>
      </div>

      {/* Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {TIER_METADATA.map((meta) => {
          const tier = meta.level;
          const isRevealed = !!revealedHints[tier];
          const isLoading = loadingTier === tier;
          const errorMsg = errorTier[tier];
          const hintData = revealedHints[tier];
          const isCopied = copiedTier === tier;
          const TierIcon = meta.icon;

          // Determine locked status: Level 1 is always unlocked to reveal.
          // Level 2 can be unlocked, but shows advisory if Level 1 is skipped.
          // Level 3 can be unlocked, but shows advisory if Level 2 is skipped.
          const isPreviousUnlocked = tier === 1 || !!revealedHints[tier - 1];

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "rounded-xl border transition-all duration-200 overflow-hidden",
                isRevealed
                  ? `${meta.borderActive} bg-gradient-to-b ${meta.accentColor} bg-slate-900/90 shadow-lg`
                  : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700/80"
              )}
            >
              {/* Card Header */}
              <div className="p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                      isRevealed
                        ? meta.badgeColor
                        : "bg-slate-800 text-slate-400 border border-slate-700/60"
                    )}
                  >
                    {isRevealed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <TierIcon className="h-3.5 w-3.5 text-slate-300" />
                        {meta.title}
                      </h4>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", meta.badgeColor)}>
                        {meta.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>

                {/* Top Action / Status */}
                {isRevealed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyHint(tier, `${hintData.hint}\n\nNext Action: ${hintData.next_action}`)}
                    className="h-7 px-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    title="Copy hint to clipboard"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>

              {/* Card Body */}
              <AnimatePresence>
                {isRevealed && hintData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/50 space-y-2.5"
                  >
                    <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-slate-700">
                      {hintData.hint}
                    </div>

                    {hintData.next_action && (
                      <div className="rounded-md bg-emerald-950/20 border border-emerald-500/30 p-2.5 flex items-start gap-2 text-[11px] text-emerald-300/90 leading-snug">
                        <ArrowRight className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-emerald-300">Next Action: </span>
                          {hintData.next_action}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error State */}
              {errorMsg && (
                <div className="p-3 mx-3.5 mb-3 rounded-lg bg-red-950/30 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[11px]">{errorMsg}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestHint(tier)}
                      className="mt-2 h-6 text-[10px] border-red-500/40 hover:bg-red-900/30 text-red-200"
                    >
                      Retry Hint {tier}
                    </Button>
                  </div>
                </div>
              )}

              {/* Unrevealed Footer with Reveal Button */}
              {!isRevealed && (
                <div className="px-3.5 pb-3.5 pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 italic">
                    {!isPreviousUnlocked
                      ? `Recommended: Unlock Level ${tier - 1} first for step-by-step discovery.`
                      : "Explicit request required to reveal this hint."}
                  </span>

                  <Button
                    size="sm"
                    disabled={isLoading}
                    onClick={() => requestHint(tier)}
                    className={cn(
                      "h-7 text-xs font-semibold px-3 shadow-sm",
                      meta.buttonGradient
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Reveal Hint {tier}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Footer Pedagogical Notice */}
        <div className="p-3 rounded-lg border border-slate-800/50 bg-slate-900/20 text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
          <Lightbulb className="h-4 w-4 text-amber-400/80 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-300 font-medium">LocalLearn Socratic Principle:</span>{" "}
            Hints are structured progressively so you can discover the solution on your own.
            Try implementing each hint before requesting the next tier.
          </div>
        </div>
      </div>
    </div>
  );
}
