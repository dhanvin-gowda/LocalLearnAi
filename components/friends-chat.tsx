"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Send,
  CheckCheck,
  Check,
  Sparkles,
  ArrowLeft,
  Circle,
  Plus,
  Lock,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  UserPlus,
  MessageSquare,
  Shield,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AuthModal } from "@/components/auth-modal";
import { FindFriendsModal } from "@/components/find-friends-modal";
import Link from "next/link";

interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarColor: string;
}

interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: number;
  readAt: number | null;
}

interface FriendItem {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  status: "online" | "offline";
  lastSeenAt: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface PendingRequest {
  id: string;
  fromUser: {
    id: string;
    username: string;
    displayName: string;
    initials: string;
    avatarColor: string;
  };
  createdAt: number;
}

export function FriendsChat() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFindFriendsModalOpen, setIsFindFriendsModalOpen] = useState(false);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ roomId: string; roomUrl: string } | null>(null);
  const [recentRooms, setRecentRooms] = useState<Array<{ roomId: string; lastVisited: number }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const activeFriend = friends.find((f) => f.id === selectedFriendId) || null;

  // 1. Initial Authentication Check
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("chat_jwt");
        if (!storedToken) {
          // If no token, auto-login as demo user 'aarav' for an instant out-of-the-box experience
          try {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: "aarav", password: "password123" }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.token && data.user) {
                localStorage.setItem("chat_jwt", data.token);
                localStorage.setItem("chat_user", JSON.stringify(data.user));
                setJwtToken(data.token);
                setCurrentUser(data.user);
                setAuthLoading(false);
                return;
              }
            }
          } catch {
            // fallback
          }
          setAuthLoading(false);
          return;
        }

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            setJwtToken(storedToken);
          } else {
            localStorage.removeItem("chat_jwt");
          }
        } else {
          localStorage.removeItem("chat_jwt");
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // 2. Fetch Friends and Pending Requests
  const fetchFriends = useCallback(async () => {
    if (!jwtToken) return;
    try {
      const res = await fetch("/api/friends/list", {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.friends) {
          setFriends(data.friends);
          // If no friend selected yet, select the first friend
          setSelectedFriendId((prev) => {
            if (prev && data.friends.some((f: FriendItem) => f.id === prev)) {
              return prev;
            }
            return data.friends.length > 0 ? data.friends[0].id : null;
          });
        }
        if (data.requests?.incoming) {
          setPendingRequests(data.requests.incoming);
        }
      }
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  }, [jwtToken]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // 3. Fetch Messages for Selected Friend
  const fetchMessages = useCallback(async () => {
    if (!jwtToken || !selectedFriendId) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`/api/chat/${selectedFriendId}/messages`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          // Clear local unread count for this friend
          setFriends((prev) =>
            prev.map((f) => (f.id === selectedFriendId ? { ...f, unreadCount: 0 } : f))
          );
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [jwtToken, selectedFriendId]);

  useEffect(() => {
    fetchMessages();
    setIsFriendTyping(false);
  }, [fetchMessages]);

  // 4. SSE Real-Time Event Listener
  useEffect(() => {
    if (!jwtToken || !currentUser) return;

    // Connect to real-time event stream
    const eventSource = new EventSource(`/api/chat/events?token=${encodeURIComponent(jwtToken)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle new incoming message
        if (data.type === "new_message") {
          const msg: DirectMessage = data.message;

          // If message is between currentUser and activeFriend
          if (
            (msg.senderId === selectedFriendId && msg.recipientId === currentUser.id) ||
            (msg.senderId === currentUser.id && msg.recipientId === selectedFriendId)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // Mark message as read immediately
            if (msg.senderId === selectedFriendId) {
              fetch(`/api/chat/${selectedFriendId}/read`, {
                method: "POST",
                headers: { Authorization: `Bearer ${jwtToken}` },
              }).catch(() => {});
            }
          }

          // Update friends list: last message & unread badge
          setFriends((prev) =>
            prev.map((f) => {
              const otherUserId = msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
              if (f.id === otherUserId) {
                const isCurrentActive = otherUserId === selectedFriendId;
                return {
                  ...f,
                  lastMessage: msg.text,
                  lastMessageTime: new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  unreadCount: isCurrentActive ? 0 : f.unreadCount + 1,
                };
              }
              return f;
            })
          );
        }

        // Handle typing indicator
        if (data.type === "typing") {
          if (data.fromUserId === selectedFriendId) {
            setIsFriendTyping(Boolean(data.isTyping));
          }
        }

        // Handle online/offline presence updates
        if (data.type === "presence") {
          setFriends((prev) =>
            prev.map((f) => (f.id === data.userId ? { ...f, status: data.status } : f))
          );
        }

        // Handle friend request received
        if (data.type === "friend_request_received") {
          fetchFriends();
        }

        // Handle friend request accepted
        if (data.type === "friend_request_accepted") {
          if (data.friend) {
            setFriends((prev) => {
              if (prev.some((f) => f.id === data.friend.id)) return prev;
              return [data.friend, ...prev];
            });
          }
          fetchFriends();
        }

        // Handle messages read receipts
        if (data.type === "messages_read") {
          setMessages((prev) =>
            prev.map((m) => (m.senderId === currentUser.id ? { ...m, readAt: Date.now() } : m))
          );
        }
      } catch (err) {
        console.error("Error processing SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection error (reconnecting automatically)...", err);
    };

    return () => {
      eventSource.close();
    };
  }, [jwtToken, currentUser, selectedFriendId, fetchFriends]);

  // 5. Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isFriendTyping]);

  // 6. Handle Typing Indicator Emission
  const emitTyping = (typing: boolean) => {
    if (!jwtToken || !selectedFriendId) return;
    if (isTypingRef.current === typing) return;
    isTypingRef.current = typing;

    fetch(`/api/chat/${selectedFriendId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ isTyping: typing }),
    }).catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit isTyping = true
    emitTyping(true);

    // Debounce resetting typing indicator after 2.5 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2500);
  };

  // 7. Send Message
  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !jwtToken || !selectedFriendId || !currentUser || isSending) return;

    // Reset typing status immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(false);

    setInputText("");
    setIsSending(true);

    // Optimistic local message insertion
    const tempId = "temp_" + Date.now();
    const optimisticMsg: DirectMessage = {
      id: tempId,
      conversationId: [currentUser.id, selectedFriendId].sort().join("::"),
      senderId: currentUser.id,
      recipientId: selectedFriendId,
      text: textToSend,
      createdAt: Date.now(),
      readAt: null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Update friend item last message
    setFriends((prev) =>
      prev.map((f) =>
        f.id === selectedFriendId
          ? {
              ...f,
              lastMessage: textToSend,
              lastMessageTime: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : f
      )
    );

    try {
      const res = await fetch(`/api/chat/${selectedFriendId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ text: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          // Replace optimistic message with actual persisted message
          setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 8. Respond to Friend Request
  const handleRespondRequest = async (requestId: string, action: "accept" | "reject") => {
    if (!jwtToken) return;
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        fetchFriends();
      }
    } catch (err) {
      console.error("Failed to respond to request:", err);
    }
  };

  // 9. Logout
  const handleLogout = () => {
    localStorage.removeItem("chat_jwt");
    localStorage.removeItem("chat_user");
    setCurrentUser(null);
    setJwtToken(null);
    setFriends([]);
    setMessages([]);
    setSelectedFriendId(null);
    setIsAuthModalOpen(true);
  };

  // 10. Room Creation
  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    try {
      const res = await fetch("/api/room/create", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.roomId && data.roomUrl) {
          setCreatedRoom({ roomId: data.roomId, roomUrl: data.roomUrl });
        }
      }
    } catch (err) {
      console.error("Failed to create room:", err);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Filter friends based on search and online status
  const filteredFriends = friends.filter((f) => {
    const matchesSearch =
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" ? true : f.status === "online";
    return matchesSearch && matchesFilter;
  });

  const onlineFriendsCount = friends.filter((f) => f.status === "online").length;

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user, token) => {
          setCurrentUser(user);
          setJwtToken(token);
        }}
      />

      {/* Find Friends Modal */}
      <FindFriendsModal
        isOpen={isFindFriendsModalOpen}
        onClose={() => setIsFindFriendsModalOpen(false)}
        token={jwtToken}
        onFriendAdded={fetchFriends}
      />

      {/* LEFT PANEL: FRIENDS & SOCIAL */}
      <div className="w-full md:w-84 md:min-w-[340px] h-auto md:h-full border-r border-neutral-800/80 bg-[#0a0a0c] flex flex-col">
        {/* Header / Identity Bar */}
        <div className="p-4 border-b border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-black shadow-md shadow-amber-500/10">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Direct Messages</h2>
                <span className="text-[10px] text-neutral-400">1-on-1 Real-time Chat</span>
              </div>
            </div>

            {/* Online counter pill */}
            <span className="text-[11px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {onlineFriendsCount} Online
            </span>
          </div>

          {/* Current Logged In User Strip */}
          {currentUser ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131318] border border-neutral-800/80">
              <div className="flex items-center gap-2.5">
                <Avatar className={`w-7 h-7 border ${currentUser.avatarColor}`}>
                  <AvatarFallback className="bg-transparent font-bold text-[10px]">
                    {currentUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    @{currentUser.username} (JWT active)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  title="Switch User / Demo Account"
                  className="p-1.5 text-neutral-400 hover:text-amber-400 rounded-lg hover:bg-neutral-800 transition-colors text-xs flex items-center gap-1"
                >
                  <span className="text-[10px] font-bold">Switch</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In or Switch Account</span>
            </button>
          )}

          {/* Action Row: Find Friend & Temporary Room */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsFindFriendsModalOpen(true)}
              className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Find Friend</span>
            </button>
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isCreatingRoom}
              className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{isCreatingRoom ? "Creating..." : "Temp Room"}</span>
            </button>
          </div>

          {/* Search Friends Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter friends by name or @user..."
              className="w-full bg-[#121216] border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                filter === "all"
                  ? "bg-white text-black shadow-sm"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              All Friends ({friends.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("online")}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                filter === "online"
                  ? "bg-white text-black shadow-sm"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online ({onlineFriendsCount})
            </button>
          </div>
        </div>

        {/* Incoming Friend Requests Banner */}
        {pendingRequests.length > 0 && (
          <div className="p-3 bg-amber-950/30 border-b border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400" />
                Friend Requests ({pendingRequests.length})
              </span>
            </div>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#1a1714] border border-amber-800/40"
              >
                <div className="flex items-center gap-2">
                  <Avatar className={`w-7 h-7 border ${req.fromUser.avatarColor}`}>
                    <AvatarFallback className="bg-transparent font-bold text-[10px]">
                      {req.fromUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xs font-bold text-white">{req.fromUser.displayName}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      @{req.fromUser.username}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(req.id, "accept")}
                    className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-md transition-colors"
                    title="Accept"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(req.id, "reject")}
                    className="p-1 bg-neutral-800 hover:bg-rose-900/60 text-neutral-300 hover:text-rose-300 rounded-md transition-colors"
                    title="Decline"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60 p-2 space-y-1">
          {createdRoom && (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 mb-2 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Room Code: {createdRoom.roomId}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/room/${createdRoom.roomId}`}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] py-1.5 rounded-lg text-center transition-colors"
                >
                  Open Room
                </Link>
                <button
                  type="button"
                  onClick={() => setCreatedRoom(null)}
                  className="px-2 text-neutral-400 hover:text-white text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {filteredFriends.length === 0 && (
            <div className="py-12 px-4 text-center text-neutral-500 space-y-3">
              <Users className="w-8 h-8 mx-auto text-neutral-600" />
              <div className="text-xs">No friends found</div>
              <button
                type="button"
                onClick={() => setIsFindFriendsModalOpen(true)}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Find New Friends
              </button>
            </div>
          )}

          {filteredFriends.map((friend) => {
            const isSelected = friend.id === selectedFriendId;
            return (
              <button
                key={friend.id}
                type="button"
                onClick={() => setSelectedFriendId(friend.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 relative ${
                  isSelected
                    ? "bg-[#18181f] border border-neutral-700/80 shadow-md"
                    : "hover:bg-[#121216] border border-transparent"
                }`}
              >
                {/* Avatar with Status Dot */}
                <div className="relative shrink-0">
                  <Avatar className={`w-10 h-10 border ${friend.avatarColor}`}>
                    <AvatarFallback className="bg-transparent font-bold text-xs">
                      {friend.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${
                      friend.status === "online" ? "bg-emerald-500" : "bg-neutral-600"
                    }`}
                  />
                </div>

                {/* Friend Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white truncate">
                      {friend.displayName}
                    </span>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-1 font-mono">
                      {friend.lastMessageTime}
                    </span>
                  </div>

                  <div className="text-[10px] text-neutral-400 font-mono mb-1">
                    @{friend.username}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">
                      {friend.lastMessage}
                    </p>

                    {/* Unread badge */}
                    {friend.unreadCount > 0 && (
                      <span className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                        {friend.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: ACTIVE CHAT CONVERSATION */}
      <div className="flex-1 flex flex-col h-full bg-[#0d0d10] relative">
        {activeFriend ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-neutral-800/80 px-4 md:px-6 flex items-center justify-between bg-[#0a0a0d]/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className={`w-9 h-9 border ${activeFriend.avatarColor}`}>
                    <AvatarFallback className="bg-transparent font-bold text-xs">
                      {activeFriend.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${
                      activeFriend.status === "online" ? "bg-emerald-500" : "bg-neutral-600"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{activeFriend.displayName}</h3>
                    <span className="text-xs text-neutral-500 font-mono">
                      @{activeFriend.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeFriend.status === "online"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-neutral-600"
                      }`}
                    />
                    <span
                      className={
                        activeFriend.status === "online"
                          ? "text-emerald-400 font-medium"
                          : "text-neutral-500"
                      }
                    >
                      {activeFriend.status === "online" ? "Online now" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicator Pill */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  E2E Encrypted History
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No messages yet</h4>
                  <p className="text-xs text-neutral-400 max-w-sm">
                    Say hello to {activeFriend.displayName}! Messages are delivered instantly in
                    real-time and saved to history.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.senderId === currentUser?.id;
                  const timeFormatted = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-end gap-2 max-w-[80%] md:max-w-[70%]">
                        {!isSelf && (
                          <Avatar className={`w-6 h-6 shrink-0 border ${activeFriend.avatarColor}`}>
                            <AvatarFallback className="bg-transparent font-bold text-[9px]">
                              {activeFriend.initials}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed shadow-sm ${
                            isSelf
                              ? "bg-amber-500 text-black font-medium rounded-br-none"
                              : "bg-[#18181f] border border-neutral-800 text-neutral-200 rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isSelf ? "text-black/70" : "text-neutral-500"
                            }`}
                          >
                            <span>{timeFormatted}</span>
                            {isSelf && (
                              <span>
                                {msg.readAt ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-black font-bold" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-black/70" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Real-time Typing Indicator */}
              {isFriendTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-2"
                >
                  <Avatar className={`w-6 h-6 border ${activeFriend.avatarColor}`}>
                    <AvatarFallback className="bg-transparent font-bold text-[9px]">
                      {activeFriend.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-[#18181f] border border-neutral-800 px-3.5 py-2 rounded-2xl rounded-bl-none flex items-center gap-2">
                    <span className="text-[11px] text-amber-400 font-medium">
                      {activeFriend.displayName} is typing
                    </span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 md:p-4 border-t border-neutral-800/80 bg-[#0a0a0d] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 bg-[#141419] border border-neutral-800 rounded-xl p-1.5 focus-within:border-amber-400 transition-colors shadow-inner"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message @${activeFriend.username}... (Press Enter to send)`}
                  className="flex-1 bg-transparent border-none px-3 py-2 text-xs md:text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 text-xs shrink-0 disabled:opacity-40 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty State: No Friend Selected */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shadow-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Select a Friend to Chat</h3>
              <p className="text-xs text-neutral-400 max-w-sm">
                Choose a study buddy from the left panel or click &quot;Find Friend&quot; to connect
                with new peers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFindFriendsModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Find Friends</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
