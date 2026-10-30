import { NextRequest } from "next/server";
import { subscribeToRoom, getRoom, createRoom } from "@/lib/room-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // Ensure room exists
  if (!getRoom(roomId)) {
    createRoom(roomId);
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial handshake event
      controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ status: "connected", roomId })}\n\n`));

      // Subscribe to real-time broadcasts
      cleanup = subscribeToRoom(roomId, (eventData) => {
        try {
          const payload = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error("Error streaming SSE event:", err);
        }
      });

      // Keepalive heartbeat every 20 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        if (cleanup) cleanup();
        try {
          controller.close();
        } catch {
          // ignore already closed
        }
      });
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
