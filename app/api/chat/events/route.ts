import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { subscribeUserEvents } from "@/lib/chat-store";

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial handshake
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", userId: authUser.userId })}\n\n`)
      );

      // 2. Real-time event subscriber
      cleanup = subscribeUserEvents(authUser.userId, (eventData) => {
        try {
          const payload = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error("SSE stream enqueue error:", err);
        }
      });

      // 3. Heartbeat keepalive every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // 4. Handle client disconnection
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
