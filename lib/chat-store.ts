import fs from "fs";
import path from "path";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./auth";

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatarColor: string;
  initials: string;
  createdAt: number;
  lastSeenAt: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  updatedAt: number;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string; // sorted `user1:user2`
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: number;
  readAt: number | null;
}

export interface FriendListItem {
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

export type ChatSSEEvent =
  | { type: "connected"; userId: string }
  | { type: "new_message"; message: DirectMessage }
  | { type: "typing"; fromUserId: string; isTyping: boolean }
  | { type: "presence"; userId: string; status: "online" | "offline" }
  | { type: "friend_request_received"; request: FriendRequest; fromUser: { id: string; username: string; displayName: string } }
  | { type: "friend_request_accepted"; friendship: Friendship; friend: FriendListItem }
  | { type: "messages_read"; byUserId: string; conversationId: string };

type SSEListener = (event: ChatSSEEvent) => void;

interface ChatStoreData {
  users: Record<string, User>;
  friendRequests: Record<string, FriendRequest>;
  friendships: Record<string, Friendship>;
  messages: Record<string, DirectMessage>;
}

interface ChatStoreState {
  data: ChatStoreData;
  listeners: Map<string, Set<SSEListener>>; // userId -> listeners
  onlineHeartbeats: Map<string, number>; // userId -> last timestamp
  typingMap: Map<string, Map<string, NodeJS.Timeout>>; // toUserId -> (fromUserId -> timeout)
}

declare global {
  // eslint-disable-next-line no-var
  var __CHAT_STORE__: ChatStoreState | undefined;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "chat_db.json");

const AVATAR_COLORS = [
  "bg-emerald-600/30 text-emerald-400 border-emerald-500/40",
  "bg-purple-600/30 text-purple-400 border-purple-500/40",
  "bg-amber-600/30 text-amber-400 border-amber-500/40",
  "bg-blue-600/30 text-blue-400 border-blue-500/40",
  "bg-rose-600/30 text-rose-400 border-rose-500/40",
  "bg-cyan-600/30 text-cyan-400 border-cyan-500/40",
];

function getConversationId(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join("::");
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "U").toUpperCase();
}

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function getInitialStore(): ChatStoreState {
  if (globalThis.__CHAT_STORE__) {
    return globalThis.__CHAT_STORE__;
  }

  let fileData: ChatStoreData | null = null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      if (raw && raw.trim()) {
        fileData = JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error("Failed to read chat_db.json:", err);
  }

  const defaultData: ChatStoreData = fileData || {
    users: {},
    friendRequests: {},
    friendships: {},
    messages: {},
  };

  // Seed default demo accounts if no users exist
  if (Object.keys(defaultData.users).length === 0) {
    const seedUsers = [
      {
        id: "usr_aarav",
        username: "aarav",
        displayName: "Aarav Patel",
        password: "password123",
        avatarColor: "bg-emerald-600/30 text-emerald-400 border-emerald-500/40",
        initials: "AP",
      },
      {
        id: "usr_priya",
        username: "priya",
        displayName: "Priya Sharma",
        password: "password123",
        avatarColor: "bg-purple-600/30 text-purple-400 border-purple-500/40",
        initials: "PS",
      },
      {
        id: "usr_rahul",
        username: "rahul",
        displayName: "Rahul Verma",
        password: "password123",
        avatarColor: "bg-amber-600/30 text-amber-400 border-amber-500/40",
        initials: "RV",
      },
    ];

    for (const u of seedUsers) {
      defaultData.users[u.id] = {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        passwordHash: hashPassword(u.password),
        avatarColor: u.avatarColor,
        initials: u.initials,
        createdAt: Date.now() - 86400000,
        lastSeenAt: Date.now(),
      };
    }

    // Seed friendship between aarav and priya
    const fId = "frnd_aarav_priya";
    defaultData.friendships[fId] = {
      id: fId,
      user1Id: "usr_aarav",
      user2Id: "usr_priya",
      createdAt: Date.now() - 3600000,
    };

    // Seed initial messages
    const convId = getConversationId("usr_aarav", "usr_priya");
    const m1Id = "msg_seed_1";
    defaultData.messages[m1Id] = {
      id: m1Id,
      conversationId: convId,
      senderId: "usr_aarav",
      recipientId: "usr_priya",
      text: "Hey Priya! Welcome to the new real-time chat.",
      createdAt: Date.now() - 1800000,
      readAt: Date.now() - 1700000,
    };
    const m2Id = "msg_seed_2";
    defaultData.messages[m2Id] = {
      id: m2Id,
      conversationId: convId,
      senderId: "usr_priya",
      recipientId: "usr_aarav",
      text: "Hi Aarav! Love the instant messaging and typing indicators! 🚀",
      createdAt: Date.now() - 900000,
      readAt: Date.now() - 800000,
    };
  }

  const state: ChatStoreState = {
    data: defaultData,
    listeners: new Map(),
    onlineHeartbeats: new Map(),
    typingMap: new Map(),
  };

  globalThis.__CHAT_STORE__ = state;
  persistToDisk(state);
  return state;
}

function persistToDisk(target?: ChatStoreState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = target || globalThis.__CHAT_STORE__;
    if (current && current.data) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(current.data, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed to persist chat_db.json to disk:", err);
  }
}

const store = getInitialStore();

// ==================== USER MANAGEMENT ====================

export function createUser(username: string, displayName: string, password: string): User {
  const cleanUsername = username.trim().toLowerCase();
  const cleanDisplayName = displayName.trim() || cleanUsername;

  // Check unique username
  for (const existing of Object.values(store.data.users)) {
    if (existing.username.toLowerCase() === cleanUsername) {
      throw new Error("Username already taken. Please pick another.");
    }
  }

  const id = "usr_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex");
  const user: User = {
    id,
    username: cleanUsername,
    displayName: cleanDisplayName,
    passwordHash: hashPassword(password),
    avatarColor: getRandomColor(),
    initials: getInitials(cleanDisplayName),
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  store.data.users[id] = user;
  persistToDisk();
  return user;
}

export function authenticateUser(username: string, password: string): User | null {
  const cleanUsername = username.trim().toLowerCase();
  const user = Object.values(store.data.users).find(
    (u) => u.username.toLowerCase() === cleanUsername
  );
  if (!user) return null;

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  user.lastSeenAt = Date.now();
  persistToDisk();
  return user;
}

export function getUserById(id: string): User | null {
  return store.data.users[id] || null;
}

export function getUserByUsername(username: string): User | null {
  const cleanUsername = username.trim().toLowerCase();
  return Object.values(store.data.users).find((u) => u.username.toLowerCase() === cleanUsername) || null;
}

export function searchUsers(query: string, currentUserId: string): Array<{
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  friendshipStatus: "friends" | "pending_sent" | "pending_received" | "none";
  requestId?: string;
}> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const results: Array<{
    id: string;
    username: string;
    displayName: string;
    initials: string;
    avatarColor: string;
    friendshipStatus: "friends" | "pending_sent" | "pending_received" | "none";
    requestId?: string;
  }> = [];

  for (const user of Object.values(store.data.users)) {
    if (user.id === currentUserId) continue;

    if (
      user.username.toLowerCase().includes(clean) ||
      user.displayName.toLowerCase().includes(clean)
    ) {
      const { status, requestId } = getFriendshipStatus(currentUserId, user.id);
      results.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        initials: user.initials,
        avatarColor: user.avatarColor,
        friendshipStatus: status,
        requestId,
      });
    }
  }

  return results.slice(0, 15);
}

// ==================== FRIEND & RELATIONSHIP MANAGEMENT ====================

export function getFriendshipStatus(
  userAId: string,
  userBId: string
): { status: "friends" | "pending_sent" | "pending_received" | "none"; requestId?: string } {
  // Check if friends
  const isFriend = Object.values(store.data.friendships).some(
    (f) =>
      (f.user1Id === userAId && f.user2Id === userBId) ||
      (f.user1Id === userBId && f.user2Id === userAId)
  );
  if (isFriend) return { status: "friends" };

  // Check pending request sent by userA
  const sentReq = Object.values(store.data.friendRequests).find(
    (r) => r.fromUserId === userAId && r.toUserId === userBId && r.status === "pending"
  );
  if (sentReq) return { status: "pending_sent", requestId: sentReq.id };

  // Check pending request received by userA
  const recvReq = Object.values(store.data.friendRequests).find(
    (r) => r.fromUserId === userBId && r.toUserId === userAId && r.status === "pending"
  );
  if (recvReq) return { status: "pending_received", requestId: recvReq.id };

  return { status: "none" };
}

export function sendFriendRequest(fromUserId: string, toUserId: string): FriendRequest {
  if (fromUserId === toUserId) {
    throw new Error("You cannot send a friend request to yourself.");
  }
  const targetUser = store.data.users[toUserId];
  if (!targetUser) {
    throw new Error("Target user does not exist.");
  }

  const { status } = getFriendshipStatus(fromUserId, toUserId);
  if (status === "friends") {
    throw new Error("You are already friends with this user.");
  }
  if (status === "pending_sent") {
    throw new Error("Friend request is already pending.");
  }
  if (status === "pending_received") {
    // If they already sent a request, auto-accept it!
    const req = Object.values(store.data.friendRequests).find(
      (r) => r.fromUserId === toUserId && r.toUserId === fromUserId && r.status === "pending"
    );
    if (req) {
      respondFriendRequest(req.id, fromUserId, "accept");
      return req;
    }
  }

  const id = "req_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex");
  const request: FriendRequest = {
    id,
    fromUserId,
    toUserId,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  store.data.friendRequests[id] = request;
  persistToDisk();

  // Notify recipient via SSE
  const fromUser = store.data.users[fromUserId];
  broadcastToUser(toUserId, {
    type: "friend_request_received",
    request,
    fromUser: {
      id: fromUser.id,
      username: fromUser.username,
      displayName: fromUser.displayName,
    },
  });

  return request;
}

export function respondFriendRequest(
  requestId: string,
  toUserId: string,
  action: "accept" | "reject"
): { request: FriendRequest; friendship?: Friendship } {
  const request = store.data.friendRequests[requestId];
  if (!request) {
    throw new Error("Friend request not found.");
  }
  if (request.toUserId !== toUserId) {
    throw new Error("Unauthorized to respond to this friend request.");
  }
  if (request.status !== "pending") {
    throw new Error("Friend request is no longer pending.");
  }

  request.status = action === "accept" ? "accepted" : "rejected";
  request.updatedAt = Date.now();

  let friendship: Friendship | undefined;

  if (action === "accept") {
    const fId = "frnd_" + [request.fromUserId, request.toUserId].sort().join("_");
    friendship = {
      id: fId,
      user1Id: request.fromUserId,
      user2Id: request.toUserId,
      createdAt: Date.now(),
    };
    store.data.friendships[fId] = friendship;

    // Notify both users in real-time
    const userA = store.data.users[request.fromUserId];
    const userB = store.data.users[request.toUserId];

    if (userA && userB) {
      const friendItemA = formatFriendItem(userB, request.fromUserId);
      const friendItemB = formatFriendItem(userA, request.toUserId);

      broadcastToUser(request.fromUserId, {
        type: "friend_request_accepted",
        friendship,
        friend: friendItemA,
      });

      broadcastToUser(request.toUserId, {
        type: "friend_request_accepted",
        friendship,
        friend: friendItemB,
      });
    }
  }

  persistToDisk();
  return { request, friendship };
}

function formatFriendItem(friendUser: User, currentUserId: string): FriendListItem {
  const convId = getConversationId(friendUser.id, currentUserId);
  const convMessages = Object.values(store.data.messages)
    .filter((m) => m.conversationId === convId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const lastMsg = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;

  // Unread count: messages sent by friend to currentUser where readAt is null
  const unreadCount = convMessages.filter(
    (m) => m.senderId === friendUser.id && m.recipientId === currentUserId && !m.readAt
  ).length;

  let lastTime = "";
  if (lastMsg) {
    const d = new Date(lastMsg.createdAt);
    lastTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return {
    id: friendUser.id,
    username: friendUser.username,
    displayName: friendUser.displayName,
    initials: friendUser.initials,
    avatarColor: friendUser.avatarColor,
    status: isUserOnline(friendUser.id) ? "online" : "offline",
    lastSeenAt: friendUser.lastSeenAt,
    lastMessage: lastMsg ? lastMsg.text : "Say hello to start chatting!",
    lastMessageTime: lastTime,
    unreadCount,
  };
}

export function getFriendsForUser(userId: string): FriendListItem[] {
  const friendIds = new Set<string>();

  for (const f of Object.values(store.data.friendships)) {
    if (f.user1Id === userId) friendIds.add(f.user2Id);
    if (f.user2Id === userId) friendIds.add(f.user1Id);
  }

  const list: FriendListItem[] = [];
  for (const fId of friendIds) {
    const friendUser = store.data.users[fId];
    if (friendUser) {
      list.push(formatFriendItem(friendUser, userId));
    }
  }

  return list;
}

export function getPendingRequestsForUser(userId: string): {
  incoming: Array<{
    id: string;
    fromUser: { id: string; username: string; displayName: string; initials: string; avatarColor: string };
    createdAt: number;
  }>;
  outgoing: Array<{
    id: string;
    toUser: { id: string; username: string; displayName: string; initials: string; avatarColor: string };
    createdAt: number;
  }>;
} {
  const incoming: Array<{
    id: string;
    fromUser: { id: string; username: string; displayName: string; initials: string; avatarColor: string };
    createdAt: number;
  }> = [];

  const outgoing: Array<{
    id: string;
    toUser: { id: string; username: string; displayName: string; initials: string; avatarColor: string };
    createdAt: number;
  }> = [];

  for (const req of Object.values(store.data.friendRequests)) {
    if (req.status !== "pending") continue;

    if (req.toUserId === userId) {
      const from = store.data.users[req.fromUserId];
      if (from) {
        incoming.push({
          id: req.id,
          fromUser: {
            id: from.id,
            username: from.username,
            displayName: from.displayName,
            initials: from.initials,
            avatarColor: from.avatarColor,
          },
          createdAt: req.createdAt,
        });
      }
    } else if (req.fromUserId === userId) {
      const to = store.data.users[req.toUserId];
      if (to) {
        outgoing.push({
          id: req.id,
          toUser: {
            id: to.id,
            username: to.username,
            displayName: to.displayName,
            initials: to.initials,
            avatarColor: to.avatarColor,
          },
          createdAt: req.createdAt,
        });
      }
    }
  }

  return { incoming, outgoing };
}

// ==================== MESSAGING ====================

export function sendMessage(senderId: string, recipientId: string, text: string): DirectMessage {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Message cannot be empty.");
  }
  if (!store.data.users[senderId] || !store.data.users[recipientId]) {
    throw new Error("Sender or recipient does not exist.");
  }

  const convId = getConversationId(senderId, recipientId);
  const msgId = "msg_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex");

  const message: DirectMessage = {
    id: msgId,
    conversationId: convId,
    senderId,
    recipientId,
    text: cleanText,
    createdAt: Date.now(),
    readAt: null,
  };

  store.data.messages[msgId] = message;
  persistToDisk();

  // Clear typing state when sending
  setTyping(senderId, recipientId, false);

  // Real-time broadcast to recipient and sender
  broadcastToUser(recipientId, {
    type: "new_message",
    message,
  });

  return message;
}

export function getMessages(userAId: string, userBId: string): DirectMessage[] {
  const convId = getConversationId(userAId, userBId);
  return Object.values(store.data.messages)
    .filter((m) => m.conversationId === convId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function markMessagesAsRead(currentUserId: string, friendId: string): number {
  const convId = getConversationId(currentUserId, friendId);
  let updatedCount = 0;
  const now = Date.now();

  for (const m of Object.values(store.data.messages)) {
    if (m.conversationId === convId && m.recipientId === currentUserId && !m.readAt) {
      m.readAt = now;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    persistToDisk();

    // Broadcast read event to the sender so they can see double checks
    broadcastToUser(friendId, {
      type: "messages_read",
      byUserId: currentUserId,
      conversationId: convId,
    });
  }

  return updatedCount;
}

// ==================== REAL-TIME SSE & PRESENCE ====================

export function subscribeUserEvents(userId: string, listener: SSEListener): () => void {
  if (!store.listeners.has(userId)) {
    store.listeners.set(userId, new Set());
  }
  const userListeners = store.listeners.get(userId)!;
  userListeners.add(listener);

  // Mark online & broadcast presence to friends
  setUserOnline(userId, true);

  return () => {
    userListeners.delete(listener);
    if (userListeners.size === 0) {
      store.listeners.delete(userId);
      // Wait a slight grace period before marking offline
      setTimeout(() => {
        if (!store.listeners.has(userId) || store.listeners.get(userId)!.size === 0) {
          setUserOnline(userId, false);
        }
      }, 3000);
    }
  };
}

export function broadcastToUser(userId: string, event: ChatSSEEvent) {
  const userListeners = store.listeners.get(userId);
  if (userListeners) {
    for (const listener of userListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`Error dispatching SSE event to user ${userId}:`, err);
      }
    }
  }
}

export function setUserOnline(userId: string, isOnline: boolean) {
  const user = store.data.users[userId];
  if (!user) return;

  if (isOnline) {
    store.onlineHeartbeats.set(userId, Date.now());
    user.lastSeenAt = Date.now();
  } else {
    store.onlineHeartbeats.delete(userId);
    user.lastSeenAt = Date.now();
  }

  // Broadcast to all friends
  const friends = getFriendsForUser(userId);
  for (const f of friends) {
    broadcastToUser(f.id, {
      type: "presence",
      userId,
      status: isOnline ? "online" : "offline",
    });
  }
}

export function isUserOnline(userId: string): boolean {
  const listeners = store.listeners.get(userId);
  if (listeners && listeners.size > 0) return true;

  const lastHb = store.onlineHeartbeats.get(userId);
  if (lastHb && Date.now() - lastHb < 30000) return true;

  return false;
}

export function setTyping(fromUserId: string, toUserId: string, isTyping: boolean) {
  if (!store.typingMap.has(toUserId)) {
    store.typingMap.set(toUserId, new Map());
  }
  const toMap = store.typingMap.get(toUserId)!;

  const existingTimeout = toMap.get(fromUserId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    toMap.delete(fromUserId);
  }

  if (isTyping) {
    // Auto-clear after 3 seconds
    const timeout = setTimeout(() => {
      setTyping(fromUserId, toUserId, false);
    }, 3000);
    toMap.set(fromUserId, timeout);
  }

  // Notify recipient via SSE
  broadcastToUser(toUserId, {
    type: "typing",
    fromUserId,
    isTyping,
  });
}
