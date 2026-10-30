"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  BookOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  FileText,
  HelpCircle,
  Trophy,
} from "lucide-react";

type Language = "kannada" | "hindi" | "english";

interface QuizQuestion {
  id: number;
  concept: string;
  question: string;
  options: string[];
  correctIndex: number;
}

const SAMPLE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    concept: "Action–reaction",
    question: "According to Newton's Third Law, if object A exerts a force on object B, what does object B do?",
    options: [
      "Exerts an equal force in the opposite direction on object A",
      "Absorbs the force without reacting",
      "Exerts double the force in the same direction",
      "Remains stationary regardless of magnitude",
    ],
    correctIndex: 0,
  },
  {
    id: 2,
    concept: "Friction",
    question: "Which type of friction is generally the highest for two dry surfaces in contact?",
    options: [
      "Rolling friction",
      "Fluid friction",
      "Static friction",
      "Kinetic friction",
    ],
    correctIndex: 2,
  },
  {
    id: 3,
    concept: "Momentum",
    question: "What is the formula for linear momentum (p)?",
    options: [
      "p = m / v",
      "p = m × v",
      "p = 0.5 × m × v²",
      "p = F × t²",
    ],
    correctIndex: 1,
  },
];

export function Dashboard() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("kannada");
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getGreeting = () => {
    switch (selectedLanguage) {
      case "kannada":
        return { prefix: "ನಮಸ್ಕಾರ!", suffix: "Welcome back" };
      case "hindi":
        return { prefix: "नमस्ते!", suffix: "Welcome back" };
      case "english":
        return { prefix: "Welcome back", suffix: "" };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setTimeout(() => setUploadedFileName(null), 4000);
    }
  };

  const handleAnswerSubmit = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === SAMPLE_QUIZ_QUESTIONS[quizQuestionIndex].correctIndex;
    if (isCorrect) setQuizScore((prev) => prev + 1);

    setTimeout(() => {
      if (quizQuestionIndex < SAMPLE_QUIZ_QUESTIONS.length - 1) {
        setQuizQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
      } else {
        setQuizFinished(true);
      }
    }, 600);
  };

  const resetQuiz = () => {
    setQuizOpen(false);
    setQuizQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const greeting = getGreeting();

  return (
    <div className="w-full min-h-screen bg-black text-white p-6 md:p-10 font-sans selection:bg-neutral-800">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                BHASHABRIDGE AI · OFFLINE
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
              {greeting.prefix && (
                <span className="text-white">{greeting.prefix}</span>
              )}
              {greeting.suffix && (
                <span className="text-white font-normal">{greeting.suffix}</span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            {/* Language Selector */}
            <div className="flex items-center bg-[#111113] border border-neutral-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSelectedLanguage("kannada")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedLanguage === "kannada"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                ಕನ್ನಡ
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage("hindi")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedLanguage === "hindi"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage("english")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedLanguage === "english"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                English
              </button>
            </div>

            {/* Upload New PDF Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold text-xs md:text-sm px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Upload new PDF</span>
            </button>
          </div>
        </div>

        {/* Upload Notification Toast */}
        <AnimatePresence>
          {uploadedFileName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Uploaded &amp; indexed <strong>{uploadedFileName}</strong> for offline revision.</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadedFileName(null)}
                className="text-emerald-400 hover:text-emerald-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP METRIC CARDS (4 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between"
          >
            <span className="text-xs text-neutral-400 font-medium">Documents studied</span>
            <div className="text-4xl font-bold text-white tracking-tight mt-3">3</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between"
          >
            <span className="text-xs text-neutral-400 font-medium">Concepts covered</span>
            <div className="text-4xl font-bold text-white tracking-tight mt-3">18</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between"
          >
            <span className="text-xs text-neutral-400 font-medium">Quiz average</span>
            <div className="text-4xl font-bold text-white tracking-tight mt-3">72%</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between"
          >
            <span className="text-xs text-neutral-400 font-medium">Study streak</span>
            <div className="text-4xl font-bold text-white tracking-tight mt-3">5 days</div>
          </motion.div>
        </div>

        {/* 3-COLUMN MAIN BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Continue Studying + Revise Today */}
          <div className="space-y-6">
            
            {/* Continue Studying Card */}
            <div className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white">Continue studying</h2>
              
              <div className="space-y-5">
                {/* Subject 1 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">Physics – Laws of Motion</span>
                    <span className="text-emerald-400">Page 12 · 60%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "60%" }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Subject 2 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">Chemistry – Acids and Bases</span>
                    <span className="text-emerald-400">Page 5 · 25%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "25%" }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>

                {/* Subject 3 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">Data Structures – Notes</span>
                    <span className="text-emerald-400">Page 20 · 85%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="w-fit text-xs font-semibold border border-neutral-700 hover:border-neutral-500 rounded-lg px-4 py-2 text-white bg-transparent transition-colors flex items-center gap-1.5"
              >
                <span>Open study workspace</span>
              </button>
            </div>

            {/* Revise Today Card */}
            <div className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-white">Revise today</h2>

              <div className="space-y-3.5 divide-y divide-neutral-900">
                <div className="flex items-center justify-between text-xs pt-1 first:pt-0">
                  <span className="text-white font-medium">Action–reaction</span>
                  <span className="text-rose-400 font-semibold">needs review</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-3">
                  <span className="text-white font-medium">Friction</span>
                  <span className="text-rose-400 font-semibold">needs review</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-3">
                  <span className="text-white font-medium">Momentum</span>
                  <span className="text-amber-400 font-semibold">in progress</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuizOpen(true)}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold text-xs px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <span>Start 3-question quiz</span>
              </button>
            </div>
          </div>

          {/* MIDDLE COLUMN: Concept Mastery */}
          <div className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[380px]">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">Concept mastery</h2>

              <div className="flex flex-wrap gap-2.5">
                {/* Green Badges (Mastered) */}
                <span className="bg-[#064e3b]/90 border border-emerald-600/40 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Inertia
                </span>
                <span className="bg-[#064e3b]/90 border border-emerald-600/40 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Force
                </span>
                <span className="bg-[#064e3b]/90 border border-emerald-600/40 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Mass
                </span>

                {/* Amber Badges (In Progress) */}
                <span className="bg-[#78350f]/80 border border-amber-600/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Acceleration
                </span>
                <span className="bg-[#78350f]/80 border border-amber-600/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Momentum
                </span>

                {/* Red Badges (Needs Review) */}
                <span className="bg-[#7f1d1d]/80 border border-rose-600/40 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Action–reaction
                </span>
                <span className="bg-[#7f1d1d]/80 border border-rose-600/40 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-default transition hover:scale-105">
                  Friction
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="pt-8 text-xs text-neutral-400 space-y-1">
              <div className="flex items-center gap-4">
                <span>Green: mastered</span>
                <span>Amber: in progress</span>
              </div>
              <div>
                <span>Red: needs review</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Quiz History */}
          <div className="bg-[#0d0d0f] border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[380px]">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">Quiz history</h2>

              {/* Chart container */}
              <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
                {/* Bar 1: 40% */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "40%" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full bg-[#60a5fa] rounded-lg"
                  />
                  <span className="text-xs text-neutral-400 font-semibold">40%</span>
                </div>

                {/* Bar 2: 60% */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "60%" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="w-full bg-[#60a5fa] rounded-lg"
                  />
                  <span className="text-xs text-neutral-400 font-semibold">60%</span>
                </div>

                {/* Bar 3: 80% */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "80%" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="w-full bg-[#60a5fa] rounded-lg"
                  />
                  <span className="text-xs text-neutral-400 font-semibold">80%</span>
                </div>

                {/* Bar 4: 80% (Emerald) */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "80%" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                    className="w-full bg-[#34d399] rounded-lg"
                  />
                  <span className="text-xs text-neutral-400 font-semibold">80%</span>
                </div>
              </div>
            </div>

            {/* Bottom highlight text */}
            <div className="pt-6 text-xs text-neutral-400">
              Weakest concept last time:{" "}
              <strong className="text-white font-bold">Action–reaction</strong>
            </div>
          </div>
        </div>

        {/* GITHUB-STYLE FOOTER PROGRESS SECTION */}
        <div className="border-t border-neutral-800/80 pt-6 mt-10 space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold text-white">
            <div className="flex items-center gap-2">
              <span>Languages</span>
              <span className="text-xs text-neutral-400 font-normal">· Study time distribution</span>
            </div>
            <span className="text-xs text-neutral-400 font-normal">24.5 hrs total</span>
          </div>

          {/* GitHub-style Thin Segmented Progress Bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-neutral-800 gap-[2px]">
            {/* 55% Kannada (Emerald) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "55%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-[#34d399] transition-opacity hover:opacity-85 cursor-pointer"
              title="Kannada: 55.0% (13.5 hrs)"
            />
            {/* 30% Hindi (Gold/Amber) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "30%" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              className="h-full bg-[#fbbf24] transition-opacity hover:opacity-85 cursor-pointer"
              title="Hindi: 30.0% (7.4 hrs)"
            />
            {/* 15% English (Blue) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "15%" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              className="h-full bg-[#60a5fa] transition-opacity hover:opacity-85 cursor-pointer"
              title="English: 15.0% (3.6 hrs)"
            />
          </div>

          {/* GitHub-style Legend: Colored Dot + Bold Name + Muted Percentage */}
          <div className="flex flex-wrap items-center gap-6 text-xs pt-0.5">
            <div className="flex items-center gap-2 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] group-hover:ring-2 ring-[#34d399]/40 transition-all" />
              <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">Kannada</span>
              <span className="text-neutral-400 font-normal">55.0%</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] group-hover:ring-2 ring-[#fbbf24]/40 transition-all" />
              <span className="font-semibold text-white group-hover:text-amber-300 transition-colors">Hindi</span>
              <span className="text-neutral-400 font-normal">30.0%</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa] group-hover:ring-2 ring-[#60a5fa]/40 transition-all" />
              <span className="font-semibold text-white group-hover:text-blue-300 transition-colors">English</span>
              <span className="text-neutral-400 font-normal">15.0%</span>
            </div>
          </div>

          {/* GitHub-style Study Streak Activity Heatmap */}
          <div className="pt-4 border-t border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">Study Activity</span>
              <span className="text-neutral-500">· 5-day streak active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-500 mr-1">Less</span>
              <span className="w-2.5 h-2.5 rounded-xs bg-neutral-800" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#064e3b]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#047857]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#34d399]" />
              <span className="text-[10px] text-neutral-500 ml-1">More</span>
            </div>
          </div>

          {/* Offline Sync Note */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-900">
            <span>Sample data for the mockup. Progress is stored in the browser, so everything works offline.</span>
            <span className="flex items-center gap-1.5 text-neutral-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Offline Synced
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE 3-QUESTION QUIZ MODAL */}
      <AnimatePresence>
        {quizOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f12] border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Quick Revision Quiz</h3>
                </div>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!quizFinished ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                      {SAMPLE_QUIZ_QUESTIONS[quizQuestionIndex].concept}
                    </span>
                    <span>
                      Question {quizQuestionIndex + 1} of {SAMPLE_QUIZ_QUESTIONS.length}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-white leading-relaxed">
                    {SAMPLE_QUIZ_QUESTIONS[quizQuestionIndex].question}
                  </p>

                  <div className="space-y-2 pt-2">
                    {SAMPLE_QUIZ_QUESTIONS[quizQuestionIndex].options.map((opt, i) => {
                      const isSelected = selectedAnswer === i;
                      const isCorrect = i === SAMPLE_QUIZ_QUESTIONS[quizQuestionIndex].correctIndex;
                      let btnStyle = "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-200";
                      if (selectedAnswer !== null) {
                        if (isCorrect) {
                          btnStyle = "border-emerald-500 bg-emerald-950/60 text-emerald-300";
                        } else if (isSelected) {
                          btnStyle = "border-rose-500 bg-rose-950/60 text-rose-300";
                        }
                      }

                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={selectedAnswer !== null}
                          onClick={() => handleAnswerSubmit(i)}
                          className={`w-full text-left text-xs p-3 rounded-xl border transition-all ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Quiz Complete!</h4>
                  <p className="text-xs text-neutral-400">
                    You scored <strong className="text-emerald-400 font-bold">{quizScore} / {SAMPLE_QUIZ_QUESTIONS.length}</strong> on your revision session.
                  </p>
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold text-xs px-5 py-2.5 rounded-lg transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
