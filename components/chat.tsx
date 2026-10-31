"use client";

import { useEffect, useRef, useCallback, useTransition } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    SendIcon,
    XIcon,
    LoaderIcon,
    Sparkles,
    Command,
    Copy,
    Check,
    RotateCcw,
    Languages,
    Bot,
    User,
    ArrowRight,
    Terminal,
    HelpCircle,
    BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

const Figma = ({ className }: { className?: string }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
        <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
        <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
        <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
        <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
    </svg>
);

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {showRing && isFocused && (
          <motion.span 
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface MessageItem {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    model?: string;
    nextAction?: string;
    suggestedFollowups?: string[];
}

export function AnimatedAIChat() {
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [language, setLanguage] = useState<"en" | "kn" | "hi">("en");
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [recentCommand, setRecentCommand] = useState<string | null>(null);
    const mouseGlowRef = useRef<HTMLDivElement>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 56,
        maxHeight: 180,
    });
    const [inputFocused, setInputFocused] = useState(false);
    const commandPaletteRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load saved language & messages from localStorage
    useEffect(() => {
        try {
            const savedLang = localStorage.getItem("locallearn_tutor_lang") as "en" | "kn" | "hi" | null;
            if (savedLang && ["en", "kn", "hi"].includes(savedLang)) {
                setLanguage(savedLang);
            }
            const savedChat = localStorage.getItem("locallearn_gemini_chat_history");
            if (savedChat) {
                const parsed = JSON.parse(savedChat);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            }
        } catch (e) {
            console.warn("Could not load chat history from localStorage:", e);
        }
    }, []);

    // Persist messages
    const persistMessages = (newMessages: MessageItem[]) => {
        setMessages(newMessages);
        try {
            localStorage.setItem("locallearn_gemini_chat_history", JSON.stringify(newMessages));
        } catch (e) {
            console.warn("Could not save chat history:", e);
        }
    };

    // Auto-scroll to latest message
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping]);

    const handleLanguageChange = (newLang: "en" | "kn" | "hi") => {
        setLanguage(newLang);
        try {
            localStorage.setItem("locallearn_tutor_lang", newLang);
        } catch (e) {
            console.warn("Failed to persist language:", e);
        }
    };

    const commandSuggestions: CommandSuggestion[] = [
        { 
            icon: <HelpCircle className="w-4 h-4 text-amber-400" />, 
            label: "Explain Concept", 
            description: "Explain a Python or DSA concept step-by-step", 
            prefix: "/explain" 
        },
        { 
            icon: <Terminal className="w-4 h-4 text-emerald-400" />, 
            label: "Debug Code", 
            description: "Analyze and troubleshoot code or error messages", 
            prefix: "/debug" 
        },
        { 
            icon: <Sparkles className="w-4 h-4 text-sky-400" />, 
            label: "Progressive Hint", 
            description: "Get a Socratic clue without spoiling the code", 
            prefix: "/hint" 
        },
        { 
            icon: <BookOpen className="w-4 h-4 text-purple-400" />, 
            label: "Code Review", 
            description: "Analyze time/space complexity and code quality", 
            prefix: "/review" 
        },
        { 
            icon: <MonitorIcon className="w-4 h-4 text-violet-400" />, 
            label: "Learning Plan", 
            description: "Generate a structured topic roadmap", 
            prefix: "/plan" 
        },
    ];

    useEffect(() => {
        if (value.startsWith('/') && !value.includes(' ')) {
            setShowCommandPalette(true);
            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(value)
            );
            if (matchingSuggestionIndex >= 0) {
                setActiveSuggestion(matchingSuggestionIndex);
            } else {
                setActiveSuggestion(-1);
            }
        } else {
            setShowCommandPalette(false);
        }
    }, [value]);

    useEffect(() => {
        if (!inputFocused) return;
        let rafId: number;
        const handleMouseMove = (e: MouseEvent) => {
            rafId = requestAnimationFrame(() => {
                if (mouseGlowRef.current) {
                    mouseGlowRef.current.style.transform = `translate3d(${e.clientX - 400}px, ${e.clientY - 400}px, 0)`;
                }
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(rafId);
        };
    }, [inputFocused]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector('[data-command-button]');
            if (commandPaletteRef.current && 
                !commandPaletteRef.current.contains(target) && 
                !commandButton?.contains(target)) {
                setShowCommandPalette(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => 
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand = commandSuggestions[activeSuggestion];
                    setValue(selectedCommand.prefix + ' ');
                    setShowCommandPalette(false);
                    setRecentCommand(selectedCommand.label);
                    setTimeout(() => setRecentCommand(null), 3000);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isTyping) {
                handleSendMessage();
            }
        }
    };

    // Send user message to Gemini API
    const handleSendMessage = async (customMessage?: string) => {
        const queryText = (customMessage || value).trim();
        if (!queryText || isTyping) return;

        // Parse command prefix if present (e.g., /explain)
        let command = "";
        let cleanQuery = queryText;
        for (const cmd of commandSuggestions) {
            if (queryText.startsWith(cmd.prefix)) {
                command = cmd.prefix;
                cleanQuery = queryText.slice(cmd.prefix.length).trim() || cmd.label;
                break;
            }
        }

        const userMsg: MessageItem = {
            id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            role: "user",
            content: queryText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const updatedHistory = [...messages, userMsg];
        persistMessages(updatedHistory);
        setValue("");
        adjustHeight(true);
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: cleanQuery,
                    command,
                    language,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with status ${res.status}`);
            }

            const data = await res.json();
            const aiMsg: MessageItem = {
                id: `gemini_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                role: "assistant",
                content: data.response || "I am here to guide your programming journey. What would you like to explore next?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: data.model || "Gemini AI",
                nextAction: data.next_action || undefined,
                suggestedFollowups: data.suggested_followups || [],
            };

            persistMessages([...updatedHistory, aiMsg]);
        } catch (err: any) {
            console.error("Error communicating with Gemini API:", err);
            const errorMsg: MessageItem = {
                id: `err_${Date.now()}`,
                role: "assistant",
                content: `Could not connect to Gemini AI (${err.message || "Network Error"}). Please check your connection or retry.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: "System Notice",
            };
            persistMessages([...updatedHistory, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (e) {
            console.warn("Failed to copy:", e);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        try {
            localStorage.removeItem("locallearn_gemini_chat_history");
        } catch (e) {
            console.warn("Failed to clear chat:", e);
        }
    };

    const selectCommandSuggestion = (index: number) => {
        const selectedCommand = commandSuggestions[index];
        setValue(selectedCommand.prefix + ' ');
        setShowCommandPalette(false);
        setRecentCommand(selectedCommand.label);
        setTimeout(() => setRecentCommand(null), 2000);
        textareaRef.current?.focus();
    };

    return (
        <div className="min-h-screen flex flex-col w-full items-center justify-between bg-transparent text-white p-4 sm:p-6 relative overflow-hidden">
            {/* Ambient Animated Blurred Orbs */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
                <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
            </div>

            {/* Top Toolbar */}
            <header className="w-full max-w-3xl mx-auto flex items-center justify-between pb-4 pt-1 relative z-20 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-white tracking-wide">
                                LocalLearn Gemini AI
                            </h2>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                Powered by Gemini
                            </span>
                        </div>
                        <p className="text-[11px] text-white/50">
                            Coding mentor, debugger, and conceptual guide
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Language selector */}
                    <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs">
                        <Languages className="h-3.5 w-3.5 text-white/50 mr-1.5" />
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value as "en" | "kn" | "hi")}
                            className="bg-transparent text-xs text-white/90 focus:outline-none cursor-pointer"
                            title="Select AI Language"
                        >
                            <option value="en" className="bg-slate-900 text-white">English</option>
                            <option value="kn" className="bg-slate-900 text-white">ಕನ್ನಡ</option>
                            <option value="hi" className="bg-slate-900 text-white">हिन्दी</option>
                        </select>
                    </div>

                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearChat}
                            className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                            title="Clear conversation"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Conversation Messages Container */}
            <div className="w-full max-w-3xl flex-1 overflow-y-auto py-6 space-y-4 relative z-10 scrollbar-thin">
                {messages.length === 0 ? (
                    /* Hero Initial State */
                    <motion.div 
                        className="text-center space-y-8 my-auto py-12"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <div className="space-y-3">
                            <div className="inline-block">
                                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50 pb-1">
                                    How can I help you code today?
                                </h1>
                                <motion.div 
                                    className="h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "100%", opacity: 1 }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                />
                            </div>
                            <p className="text-sm text-white/50 max-w-md mx-auto">
                                Ask any Python or Data Structures question, analyze runtime complexity, or debug errors.
                            </p>
                        </div>

                        {/* Quick Prompts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto text-left">
                            {[
                                { text: "Explain time complexity of Two Sum", label: "Algorithm Analysis" },
                                { text: "How does string slicing s[::-1] work in Python?", label: "Python Concepts" },
                                { text: "Give me a hint for reversing a string", label: "Socratic Hint" },
                                { text: "What is the difference between list and set lookup?", label: "Data Structures" },
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSendMessage(item.text)}
                                    className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-violet-500/40 text-left transition-all group"
                                >
                                    <div className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">
                                        {item.label}
                                    </div>
                                    <div className="text-xs text-white/80 group-hover:text-white mt-1 line-clamp-1">
                                        {item.text}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    /* Active Chat History */
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const isUser = msg.role === "user";
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={cn(
                                        "flex gap-3",
                                        isUser ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {!isUser && (
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
                                            <Sparkles className="h-4 w-4 text-white" />
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg relative group",
                                            isUser
                                                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm"
                                                : "backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 rounded-bl-sm"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/[0.06] text-[11px] text-white/50">
                                            <span className="font-medium text-white/70">
                                                {isUser ? "You" : msg.model || "Gemini AI"}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span>{msg.timestamp}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(msg.id, msg.content)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-white"
                                                    title="Copy response"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                                            {msg.content}
                                        </div>

                                        {/* Next Action Callout */}
                                        {msg.nextAction && (
                                            <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                                                <ArrowRight className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-semibold text-emerald-200">Next Action: </span>
                                                    {msg.nextAction}
                                                </div>
                                            </div>
                                        )}

                                        {/* Interactive Follow-up Chips */}
                                        {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                                            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                                                {msg.suggestedFollowups.map((chip, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleSendMessage(chip)}
                                                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-violet-300 hover:text-white transition-all text-left"
                                                    >
                                                        {chip}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {isUser && (
                                        <div className="h-8 w-8 rounded-lg bg-white/[0.1] border border-white/[0.1] flex items-center justify-center shrink-0">
                                            <User className="h-4 w-4 text-white/80" />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}

                        {/* Thinking animation bubble */}
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-3 items-center"
                            >
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2 text-xs text-white/70">
                                    <span>Gemini is thinking</span>
                                    <TypingDots />
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Box Docked at Bottom */}
            <div className="w-full max-w-3xl mx-auto relative z-20 pt-2">
                <motion.div 
                    className="relative backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.08] shadow-2xl overflow-visible"
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                >
                    {/* Command Palette Dropdown */}
                    <AnimatePresence>
                        {showCommandPalette && (
                            <motion.div 
                                ref={commandPaletteRef}
                                className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-slate-950/95 rounded-xl z-50 shadow-2xl border border-white/10 overflow-hidden"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="py-1.5 divide-y divide-white/[0.05]">
                                    {commandSuggestions.map((suggestion, index) => (
                                        <motion.div
                                            key={suggestion.prefix}
                                            className={cn(
                                                "flex items-center justify-between px-3.5 py-2 text-xs transition-colors cursor-pointer",
                                                activeSuggestion === index 
                                                    ? "bg-violet-600/30 text-white" 
                                                    : "text-white/70 hover:bg-white/5"
                                            )}
                                            onClick={() => selectCommandSuggestion(index)}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center">
                                                    {suggestion.icon}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-white/90">{suggestion.label}</span>
                                                    <p className="text-[11px] text-white/40">{suggestion.description}</p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                                                {suggestion.prefix}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Textarea */}
                    <div className="p-3">
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            placeholder="Ask Gemini anything about coding, or type / for commands..."
                            containerClassName="w-full"
                            className={cn(
                                "w-full px-3 py-2",
                                "resize-none",
                                "bg-transparent",
                                "border-none",
                                "text-white/95 text-xs sm:text-sm",
                                "focus:outline-none",
                                "placeholder:text-white/30",
                                "min-h-[56px]"
                            )}
                            style={{ overflow: "hidden" }}
                            showRing={false}
                        />
                    </div>

                    {/* Input Footer Toolbar */}
                    <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center justify-between gap-4 bg-white/[0.01]">
                        <div className="flex items-center gap-2">
                            <motion.button
                                type="button"
                                data-command-button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCommandPalette(prev => !prev);
                                }}
                                whileTap={{ scale: 0.94 }}
                                className={cn(
                                    "px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-white/[0.08]",
                                    showCommandPalette 
                                        ? "bg-violet-600 text-white" 
                                        : "bg-white/[0.03] text-white/60 hover:text-white"
                                )}
                            >
                                <Command className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Commands</span>
                            </motion.button>

                            {recentCommand && (
                                <span className="text-[11px] text-violet-300 font-mono">
                                    {recentCommand} selected
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline text-[11px] text-white/30 font-mono">
                                Enter to send, Shift + Enter for newline
                            </span>

                            <motion.button
                                type="button"
                                onClick={() => handleSendMessage()}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                disabled={isTyping || !value.trim()}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                    "flex items-center gap-1.5 shadow-md",
                                    value.trim() && !isTyping
                                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-900/30 cursor-pointer"
                                        : "bg-white/[0.05] text-white/30 cursor-not-allowed"
                                )}
                            >
                                {isTyping ? (
                                    <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <SendIcon className="w-3.5 h-3.5" />
                                )}
                                <span>Send</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Glowing Mouse Tracker */}
            {inputFocused && (
                <div 
                    ref={mouseGlowRef}
                    className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px] will-change-transform"
                    style={{
                        transform: "translate3d(-400px, -400px, 0)",
                        transition: "transform 0.05s ease-out"
                    }}
                />
            )}
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{ 
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)"
                    }}
                />
            ))}
        </div>
    );
}

export default AnimatedAIChat;
