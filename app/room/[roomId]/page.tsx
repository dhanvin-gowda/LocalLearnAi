"use client";

import React, { useState, useEffect, useRef, use, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Copy,
  Check,
  Share2,
  Lock,
  ArrowLeft,
  Users,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  createdAt: number;
}

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

function RoomPageContent({ params }: RoomPageProps) {
  const { roomId } = use(params);

  const [nickname, setNickname] = useState<string>("");
  const [isNicknameSet, setIsNicknameSet] = useState<boolean>(false);
  const [nicknameInput, setNicknameInput] = useState<string>("");
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Check & Load stored nickname & save to recent rooms
  useEffect(() => {
    try {
      const savedNick = localStorage.getItem("chat_nickname");
      if (savedNick && savedNick.trim()) {
        setNickname(savedNick.trim());
        setNicknameInput(savedNick.trim());
        setIsNicknameSet(true);
      }

      // Save room to recent rooms history
      const savedRoomsRaw = localStorage.getItem("recent_rooms");
      let rooms: Array<{ roomId: string; lastVisited: number }> = [];
      if (savedRoomsRaw) {
        try {
          rooms = JSON.parse(savedRoomsRaw);
        } catch {
          rooms = [];
        }
      }
      // Put current room at the front
      rooms = [
        { roomId, lastVisited: Date.now() },
        ...rooms.filter((r) => r.roomId !== roomId),
      ].slice(0, 8);
      localStorage.setItem("recent_rooms", JSON.stringify(rooms));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, [roomId]);

  // 2. Fetch initial message history
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/room/${roomId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [roomId]);

  // 3. Connect real-time Server-Sent Events (SSE) with fallback polling
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource(`/api/room/${roomId}/events`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "message" && data.payload) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === data.payload.id)) {
                return prev;
              }
              return [...prev, data.payload];
            });
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        // Fallback polling if SSE disconnects
        if (!pollInterval) {
          pollInterval = setInterval(fetchMessages, 2500);
        }
      };
    } catch {
      pollInterval = setInterval(fetchMessages, 2500);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [roomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Nickname Submission
  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    const clean = nicknameInput.trim();
    setNickname(clean);
    setIsNicknameSet(true);
    setIsEditingNickname(false);
    try {
      localStorage.setItem("chat_nickname", clean);
    } catch (err) {
      console.error("Storage error:", err);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/room/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: nickname || "Anonymous",
          text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const getFullRoomUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/room/${roomId}`;
    }
    return `http://localhost:3000/room/${roomId}`;
  };

  const copyRoomLink = () => {
    const url = getFullRoomUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const url = getFullRoomUrl();
    const text = `Hey! Join my private chat room on BhashaBridge: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col font-sans selection:bg-neutral-800">
      
      {/* NICKNAME MODAL (No Account, Pick Nickname) */}
      <AnimatePresence>
        {(!isNicknameSet || isEditingNickname) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0f0f13] border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5"
            >
              <div className="space-y-1.5 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {isEditingNickname ? "Change your Nickname" : "Join Private Chat Room"}
                </h2>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Pick any name you'd like your friends to see. No password, no email, no sign-up.
                </p>
              </div>

              <form onSubmit={handleSaveNickname} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Your Nickname
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={30}
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="e.g. Priya, Aarav, Alex..."
                    className="w-full bg-[#16161b] border border-neutral-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Remember on this browser
                  </span>
                  <span className="text-neutral-500">Room: {roomId}</span>
                </div>

                <div className="flex gap-2">
                  {isEditingNickname && (
                    <button
                      type="button"
                      onClick={() => setIsEditingNickname(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!nicknameInput.trim()}
                    className="flex-1 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-black font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
                  >
                    {isEditingNickname ? "Save Nickname" : "Enter Room"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP ROOM NAVBAR */}
      <header className="h-16 border-b border-neutral-800/80 bg-[#0c0c0e] px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Private Room
              </span>
              <button
                type="button"
                onClick={copyRoomCode}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                title="Click to copy code"
              >
                <span>{roomId}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? "Real-time Live" : "Connecting..."}
              </span>
              <span>·</span>
              <span>No history shared outside this link</span>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* User Nickname Pill */}
          {nickname && (
            <button
              type="button"
              onClick={() => setIsEditingNickname(true)}
              className="hidden sm:flex items-center gap-1.5 bg-[#141418] hover:bg-neutral-800 border border-neutral-800 text-xs px-3 py-1.5 rounded-lg text-neutral-300 transition-colors"
              title="Click to change your nickname"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">{nickname}</span>
              <Edit2 className="w-3 h-3 text-neutral-500 ml-1" />
            </button>
          )}

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={copyRoomLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              copiedLink
                ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
                : "bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white"
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
          </button>

          {/* Share on WhatsApp */}
          <button
            type="button"
            onClick={shareOnWhatsApp}
            className="bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Share on WhatsApp</span>
          </button>
        </div>
      </header>

      {/* SHARE BANNER CALLOUT */}
      <div className="bg-[#0e0e12] border-b border-neutral-800/60 px-4 md:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Send this room link to your friend. As soon as they type their nickname, you will see their messages instantly!
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 truncate max-w-[240px]">
            {roomId}
          </span>
        </div>
      </div>

      {/* MESSAGE STREAM AREA */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">No messages yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Share the invite link with your friend. When they open it, you can chat in real time.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender.toLowerCase() === nickname.toLowerCase();
          const isSystem = msg.sender === "System";

          if (isSystem) {
            return (
              <div key={msg.id} className="flex items-center justify-center my-3">
                <span className="text-[11px] font-medium text-neutral-400 bg-neutral-900/90 border border-neutral-800/80 px-3.5 py-1.5 rounded-full text-center max-w-md shadow-sm">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[11px] font-bold text-neutral-300">
                  {isMe ? "You" : msg.sender}
                </span>
                <span className="text-[10px] text-neutral-500">· {msg.timestamp}</span>
              </div>

              <div
                className={`max-w-md md:max-w-lg rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm break-words ${
                  isMe
                    ? "bg-[#f59e0b] text-black font-medium rounded-tr-xs"
                    : "bg-[#141418] border border-neutral-800 text-neutral-100 rounded-tl-xs"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* BOTTOM INPUT BAR */}
      <div className="p-4 md:px-8 border-t border-neutral-800/80 bg-[#0c0c0e] shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              nickname
                ? `Message as ${nickname}...`
                : "Type a message..."
            }
            className="flex-1 bg-[#15151a] border border-neutral-800 rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 disabled:hover:bg-[#f59e0b] text-black font-bold px-4 md:px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RoomPage(props: RoomPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="flex items-center gap-3 text-neutral-400">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Entering room...</span>
          </div>
        </div>
      }
    >
      <RoomPageContent {...props} />
    </Suspense>
  );
}
