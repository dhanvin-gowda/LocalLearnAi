"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Languages,
  Check,
  ChevronDown,
  Trash2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Code2,
  BookOpen,
  ArrowRight,
  Loader2,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LanguageCode = "en" | "kn" | "hi";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  nextAction?: string;
  suggestedFollowups?: string[];
  isError?: boolean;
}

interface TutorChatPanelProps {
  challengeId?: string;
  challengeTitle?: string;
  problemStatement?: string;
  currentCode: string;
  className?: string;
}

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

export function TutorChatPanel({
  challengeId = "challenge",
  challengeTitle = "Coding Problem",
  problemStatement = "",
  currentCode = "",
  className,
}: TutorChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Load saved language preference and conversation history
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("locallearn_tutor_language") as LanguageCode;
      if (savedLang && ["en", "kn", "hi"].includes(savedLang)) {
        setSelectedLanguage(savedLang);
      }

      const savedChat = localStorage.getItem(`locallearn_tutor_history_${challengeId}`);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not read local storage for tutor chat:", e);
    }
  }, [challengeId]);

  // 2. Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(
          `locallearn_tutor_history_${challengeId}`,
          JSON.stringify(messages.slice(-30))
        );
      } catch (e) {}
    }
  }, [messages, challengeId]);

  // 3. Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 4. Handle language change
  const handleSelectLanguage = (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    setShowLanguageDropdown(false);
    try {
      localStorage.setItem("locallearn_tutor_language", lang);
    } catch (e) {}
  };

  // 5. Clear conversation
  const handleClearConversation = () => {
    if (window.confirm("Are you sure you want to clear your conversation with the AI Tutor?")) {
      setMessages([]);
      try {
        localStorage.removeItem(`locallearn_tutor_history_${challengeId}`);
      } catch (e) {}
    }
  };

  // 6. Send message to backend
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.length > 2000) {
      alert("Message exceeds maximum length of 2000 characters.");
      return;
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText("");
    setIsLoading(true);
    setLastFailedMessage(null);

    // Format previous messages for backend context
    const historyPayload = newHistory.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      // 1. Try local Next.js proxy route first
      let res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          challenge_title: challengeTitle,
          problem_statement: problemStatement,
          message: trimmed,
          code: currentCode,
          language: selectedLanguage,
          history: historyPayload,
        }),
      });

      // 2. If proxy returns 404/500, attempt direct FastAPI backend
      if (!res.ok && res.status !== 422) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
        try {
          res = await fetch(`${backendUrl}/tutor/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              challenge_id: challengeId,
              challenge_title: challengeTitle,
              problem_statement: problemStatement,
              message: trimmed,
              code: currentCode,
              language: selectedLanguage,
              history: historyPayload,
            }),
          });
        } catch (backendErr) {
          // Both failed
        }
      }

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          nextAction: data.next_action,
          suggestedFollowups: data.suggested_followups,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg =
          errJson.error || errJson.detail || "Unable to get guidance from AI Tutor right now.";
        setLastFailedMessage(trimmed);
        const errorMsgObj: ChatMessage = {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: errMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsgObj]);
      }
    } catch (netErr: any) {
      setLastFailedMessage(trimmed);
      const errorMsgObj: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: "Network connection lost. Please ensure the backend server is running and retry.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsgObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const codeLineCount = currentCode ? currentCode.split("\n").length : 0;

  return (
    <div
      data-testid="socratic-tutor-panel"
      className={cn(
        "flex flex-col h-full bg-[#070913] border-l border-white/10 text-white overflow-hidden shadow-2xl",
        className
      )}
    >
      {/* ============================================================
          A. TUTOR HEADER
      ============================================================ */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0a0e1e]/90 px-4 py-3 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-md shadow-indigo-500/20 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0e1e]",
                isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              )}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-white tracking-wide">
                LocalLearn AI Tutor
              </h2>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300">
                Gemma 4
              </span>
            </div>
            <span className="text-[10px] text-zinc-400">
              {isLoading ? "Thinking..." : "Socratic Guide • Online"}
            </span>
          </div>
        </div>

        {/* Actions: Language Selector & Clear Chat */}
        <div className="flex items-center gap-1.5">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              data-testid="tutor-language-selector-btn"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/80 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-white transition"
              title="Select Tutoring Language"
            >
              <Languages className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[11px] font-semibold">
                {LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage)?.native || "English"}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {showLanguageDropdown && (
              <div
                className="absolute right-0 mt-2 w-36 rounded-xl border border-white/15 bg-zinc-950 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowLanguageDropdown(false)}
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Response Language
                </div>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSelectLanguage(opt.code)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition text-left",
                      selectedLanguage === opt.code
                        ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <span>{opt.native}</span>
                    {selectedLanguage === opt.code && (
                      <Check className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Conversation Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearConversation}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ============================================================
          E. CONTEXT INDICATOR BAR
      ============================================================ */}
      <div className="border-b border-white/5 bg-[#0a0e1a]/60 px-4 py-2 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5 truncate">
          <Compass className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-zinc-500">Currently helping with:</span>
          <span className="font-semibold text-zinc-200 truncate">{challengeTitle}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-zinc-500">
          <Code2 className="h-3 w-3 text-indigo-400" />
          <span>{codeLineCount} lines of code</span>
        </div>
      </div>

      {/* ============================================================
          B & C. CHAT MESSAGES & WELCOME SCREEN
      ============================================================ */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
        {/* Welcome Screen (When conversation is empty) */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center my-auto py-6 px-2 text-center">
            <div className="relative mb-3">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-lg animate-pulse" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-zinc-900/90 text-indigo-400 shadow-xl">
                <Sparkles className="h-7 w-7" />
              </div>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              Hey! I&apos;m your LocalLearn AI Tutor.
            </h3>

            <p className="mt-1.5 max-w-xs text-xs text-zinc-400 leading-relaxed">
              I won&apos;t simply give you answers. I&apos;ll help you understand the problem and discover the solution yourself.
            </p>

            {/* Suggested Question Buttons */}
            <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-left px-1">
                Suggested Prompts
              </span>

              <button
                type="button"
                onClick={() => handleSuggestedQuestion("Can you explain this problem statement in simple terms?")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 text-left text-xs text-zinc-300 hover:border-indigo-500/40 hover:bg-zinc-900 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Explain this problem</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleSuggestedQuestion("I am stuck and don't know where to start. Can you guide me?")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 text-left text-xs text-zinc-300 hover:border-amber-500/40 hover:bg-zinc-900 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>I am stuck</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleSuggestedQuestion("Can you give me a small hint for this challenge?")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 text-left text-xs text-zinc-300 hover:border-yellow-500/40 hover:bg-zinc-900 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                  <span>Give me a hint</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleSuggestedQuestion("Can you review my current Python code and give me feedback?")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 text-left text-xs text-zinc-300 hover:border-emerald-500/40 hover:bg-zinc-900 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Review my code</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleSuggestedQuestion("Can you explain the main Python concept needed for this problem?")}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-2.5 text-left text-xs text-zinc-300 hover:border-purple-500/40 hover:bg-zinc-900 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Explain a Python concept</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        )}

        {/* Conversation Bubbles */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={cn("flex flex-col gap-1 max-w-[92%]", isUser ? "ml-auto items-end" : "mr-auto items-start")}
            >
              {/* Sender label and timestamp */}
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500">
                <span>{isUser ? "You" : "LocalLearn AI Tutor"}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-lg whitespace-pre-wrap break-words",
                  isUser
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-xs"
                    : msg.isError
                    ? "bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-tl-xs"
                    : "bg-[#0d1226] border border-indigo-500/20 text-zinc-200 rounded-tl-xs shadow-indigo-950/20"
                )}
              >
                {msg.content}

                {/* Socratic Next Action Callout */}
                {msg.nextAction && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-start gap-1.5 text-[11px] text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                    <span>
                      <strong className="text-emerald-400 font-semibold">Next Step: </strong>
                      {msg.nextAction}
                    </span>
                  </div>
                )}
              </div>

              {/* Followup suggestions if provided by AI */}
              {!isUser && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5 pt-1">
                  {msg.suggestedFollowups.map((followup, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(followup)}
                      disabled={isLoading}
                      className="rounded-full border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1 text-[10px] text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition disabled:opacity-50"
                    >
                      {followup}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col gap-1 mr-auto items-start max-w-[85%]">
            <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500">
              <span>LocalLearn AI Tutor</span>
              <span>•</span>
              <span>thinking...</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs bg-[#0d1226] border border-indigo-500/20 px-4 py-3 text-xs text-indigo-300 shadow-lg">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              <span>Formulating Socratic guidance...</span>
            </div>
          </div>
        )}

        {/* Retry State if last call failed */}
        {lastFailedMessage && !isLoading && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs text-rose-300">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>Couldn&apos;t reach the tutor service.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendMessage(lastFailedMessage)}
              className="h-6 text-[11px] border-rose-500/40 text-rose-300 hover:bg-rose-900/50"
            >
              Retry
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================================
          D. CHAT INPUT
      ============================================================ */}
      <footer className="border-t border-white/10 bg-[#0a0e1e] p-3 shrink-0">
        <div className="relative rounded-xl border border-white/15 bg-zinc-950 focus-within:border-indigo-500 transition-colors shadow-inner">
          <textarea
            ref={textareaRef}
            data-testid="tutor-chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={2}
            placeholder={
              selectedLanguage === "kn"
                ? "ನಿಮ್ಮ ಕೋಡಿಂಗ್ ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ..."
                : selectedLanguage === "hi"
                ? "अपनी कोडिंग समस्या के बारे में कुछ भी पूछें..."
                : "Ask anything about your coding problem..."
            }
            className="w-full resize-none bg-transparent p-3 pr-12 font-sans text-xs sm:text-[13px] text-white placeholder:text-zinc-500 focus:outline-none leading-relaxed disabled:opacity-50"
          />

          <div className="flex items-center justify-between border-t border-white/5 px-3 py-1.5 text-[10px] text-zinc-500">
            <span className="hidden sm:inline">
              Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">Enter</kbd> to send, <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">Shift + Enter</kbd> for newline
            </span>
            <span className="ml-auto font-mono">{inputText.length}/2000</span>
          </div>

          {/* Send Button */}
          <button
            type="button"
            data-testid="tutor-chat-send-btn"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={cn(
              "absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg transition-all",
              inputText.trim() && !isLoading
                ? "bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25 hover:scale-105 active:scale-95"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
            title="Send Message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
