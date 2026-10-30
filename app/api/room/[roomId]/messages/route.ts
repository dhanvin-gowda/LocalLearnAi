import { NextRequest, NextResponse } from "next/server";
import { getRoom, createRoom, addMessageToRoom } from "@/lib/room-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    let room = getRoom(roomId);
    if (!room) {
      room = createRoom(roomId);
    }

    return NextResponse.json({
      success: true,
      roomId: room.id,
      createdAt: room.createdAt,
      messages: room.messages,
    });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await req.json();
    const { sender, text } = body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Message text is required" },
        { status: 400 }
      );
    }

    const message = addMessageToRoom(
      roomId,
      sender || "Anonymous",
      text.trim()
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
