import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface RoomMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  createdAt: number;
}

export interface Room {
  id: string;
  createdAt: number;
  messages: RoomMessage[];
}

type Listener = (data: { type: "message" | "join"; payload: any }) => void;

interface RoomStoreState {
  rooms: Map<string, Room>;
  listeners: Map<string, Set<Listener>>;
}

declare global {
  // eslint-disable-next-line no-var
  var __ROOM_STORE__: RoomStoreState | undefined;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "rooms.json");

function getInitialStore(): RoomStoreState {
  if (globalThis.__ROOM_STORE__) {
    return globalThis.__ROOM_STORE__;
  }

  const rooms = new Map<string, Room>();
  const listeners = new Map<string, Set<Listener>>();

  // Load from disk if exists
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed: Record<string, Room> = JSON.parse(raw);
      for (const [id, room] of Object.entries(parsed)) {
        rooms.set(id, room);
      }
    }
  } catch (err) {
    console.error("Failed to read rooms from disk:", err);
  }

  const store: RoomStoreState = { rooms, listeners };
  globalThis.__ROOM_STORE__ = store;
  return store;
}

const store = getInitialStore();

function persistToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serializable: Record<string, Room> = {};
    for (const [id, room] of store.rooms.entries()) {
      serializable[id] = room;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(serializable, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist rooms to disk:", err);
  }
}

export function generateRoomCode(): string {
  // Generates clean, URL-safe 10-char alphanumeric code (e.g. k7Xp9aQ2mR)
  const bytes = crypto.randomBytes(8);
  return bytes
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10);
}

export function createRoom(customCode?: string): Room {
  const id = customCode?.trim() || generateRoomCode();
  const existing = store.rooms.get(id);
  if (existing) {
    return existing;
  }

  const newRoom: Room = {
    id,
    createdAt: Date.now(),
    messages: [
      {
        id: "sys_init",
        sender: "System",
        text: "Room created! Share this link with your friend to chat privately in real-time.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: Date.now(),
      },
    ],
  };

  store.rooms.set(id, newRoom);
  persistToDisk();
  return newRoom;
}

export function getRoom(id: string): Room | null {
  return store.rooms.get(id) || null;
}

export function addMessageToRoom(
  roomId: string,
  sender: string,
  text: string
): RoomMessage {
  let room = store.rooms.get(roomId);
  if (!room) {
    room = createRoom(roomId);
  }

  const message: RoomMessage = {
    id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    sender: sender.trim() || "Anonymous",
    text: text.trim(),
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    createdAt: Date.now(),
  };

  room.messages.push(message);
  persistToDisk();

  // Broadcast to active SSE listeners
  broadcastToRoom(roomId, { type: "message", payload: message });

  return message;
}

export function subscribeToRoom(roomId: string, listener: Listener): () => void {
  if (!store.listeners.has(roomId)) {
    store.listeners.set(roomId, new Set());
  }

  const roomListeners = store.listeners.get(roomId)!;
  roomListeners.add(listener);

  return () => {
    roomListeners.delete(listener);
    if (roomListeners.size === 0) {
      store.listeners.delete(roomId);
    }
  };
}

export function broadcastToRoom(
  roomId: string,
  data: { type: "message" | "join"; payload: any }
) {
  const roomListeners = store.listeners.get(roomId);
  if (roomListeners) {
    for (const listener of roomListeners) {
      try {
        listener(data);
      } catch (err) {
        console.error("Error in listener callback:", err);
      }
    }
  }
}
