import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/room-store";

export async function POST(req: NextRequest) {
  try {
    let customCode: string | undefined;
    try {
      const body = await req.json();
      if (body?.roomId) {
        customCode = String(body.roomId).trim();
      }
    } catch {
      // empty body is fine
    }

    const room = createRoom(customCode);
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const roomUrl = `${protocol}://${host}/room/${room.id}`;

    return NextResponse.json({
      success: true,
      roomId: room.id,
      roomUrl,
      createdAt: room.createdAt,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create room" },
      { status: 500 }
    );
  }
}
