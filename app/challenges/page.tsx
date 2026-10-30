"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  Filter,
  GraduationCap,
  Layers,
  Play,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Challenge, fetchAllChallenges, FALLBACK_CHALLENGES } from "@/lib/challenges";
import { SessionNavBar } from "@/app/page";
import { cn } from "@/lib/utils";

export default function ChallengesCatalogPage() {
  const [challenges, setChallenges] = useState<Challenge[]>(FALLBACK_CHALLENGES);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await fetchAllChallenges();
      setChallenges(data);
      setIsLoading(false);
    }
    load();
  }, []);

  const topics = ["all", ...Array.from(new Set(challenges.map((c) => c.topic)))];

  const filteredChallenges = challenges.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.topic.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDifficulty =
      selectedDifficulty === "all" ||
      c.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

    const matchesTopic =
      selectedTopic === "all" || c.topic.toLowerCase() === selectedTopic.toLowerCase();

    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  return (
    <div className="flex min-h-screen w-full bg-[#050505] text-white">
      <SessionNavBar />

      <main className="flex-1 w-full pl-[3.05rem] min-h-screen flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="border-b border-white/10 bg-black/60 px-6 py-8 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                  <Trophy className="h-4 w-4" />
                  <span>Curated Learning Track</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Python & DSA Challenges
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Master core algorithmic concepts through structured practice, automated unit tests, and Socratic AI hints.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-2 text-xs font-mono text-zinc-300">
                  {challenges.length} Challenges Available
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mt-4 flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search challenges by title, topic, or keyword..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Topic filter */}
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 transition"
              >
                {topics.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">
                    Topic: {t === "all" ? "All Topics" : t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Challenges Grid */}
        <div className="max-w-6xl mx-auto w-full p-6 md:p-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-zinc-900/70 hover:shadow-2xl hover:shadow-emerald-500/5"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {challenge.difficulty}
                    </span>

                    <span className="text-xs font-mono text-zinc-500">
                      {challenge.topic}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    <Link href={`/challenges/${challenge.id}`}>
                      {challenge.title}
                    </Link>
                  </h2>

                  <p className="mt-2 text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {challenge.description}
                  </p>

                  {/* Learning Objectives Preview */}
                  {challenge.learning_objectives && challenge.learning_objectives.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 mb-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Key Concept:</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {challenge.learning_objectives[0]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                  <Link
                    href={`/challenges/${challenge.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-zinc-400" />
                    <span>View Challenge</span>
                  </Link>

                  <Link
                    href={`/workspace/${challenge.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-black transition hover:bg-emerald-400"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Practicing</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
