"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Check, Clock, UserCheck, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  friendshipStatus: "friends" | "pending_sent" | "pending_received" | "none";
  requestId?: string;
}

interface FindFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onFriendAdded?: () => void;
}

export function FindFriendsModal({ isOpen, onClose, token, onFriendAdded }: FindFriendsModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !token) {
      setResults([]);
      setQuery("");
      return;
    }

    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.users) {
            setResults(data.users);
          }
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen, token]);

  const handleSendRequest = async (targetUserId: string) => {
    if (!token) return;
    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        setResults((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, friendshipStatus: "pending_sent" } : u))
        );
        onFriendAdded?.();
      }
    } catch (err) {
      console.error("Failed to send request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (requestId: string, targetUserId: string) => {
    if (!token || !requestId) return;
    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      if (res.ok) {
        setResults((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, friendshipStatus: "friends" } : u))
        );
        onFriendAdded?.();
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0e0e12] border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white flex flex-col max-h-[85vh]"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Find Study Buddies</h2>
              <p className="text-xs text-neutral-400">Search users by username to send friend requests</p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username (e.g. aarav, priya, rahul)..."
              className="w-full bg-[#16161c] border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs md:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3 animate-spin" />
            )}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
            {query.trim() && !loading && results.length === 0 && (
              <div className="py-8 text-center text-neutral-500 text-xs">
                No users found matching &quot;{query}&quot;. Try another username.
              </div>
            )}

            {!query.trim() && (
              <div className="py-8 text-center text-neutral-500 text-xs">
                Type a username to discover friends and connect instantly.
              </div>
            )}

            {results.map((user) => {
              const isLoading = actionLoading[user.id];
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#141419] border border-neutral-800/80 hover:border-neutral-700/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className={`w-9 h-9 border ${user.avatarColor}`}>
                      <AvatarFallback className="bg-transparent font-bold text-xs">
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{user.displayName}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        @{user.username}
                      </div>
                    </div>
                  </div>

                  {/* Relationship Action */}
                  <div>
                    {user.friendshipStatus === "friends" && (
                      <span className="text-xs bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Friends
                      </span>
                    )}

                    {user.friendshipStatus === "pending_sent" && (
                      <span className="text-xs bg-amber-950/60 border border-amber-500/30 text-amber-300 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Request Sent
                      </span>
                    )}

                    {user.friendshipStatus === "pending_received" && (
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(user.requestId!, user.id)}
                        disabled={isLoading}
                        className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Accept Request
                          </>
                        )}
                      </button>
                    )}

                    {user.friendshipStatus === "none" && (
                      <button
                        type="button"
                        onClick={() => handleSendRequest(user.id)}
                        disabled={isLoading}
                        className="text-xs bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Add Friend
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
