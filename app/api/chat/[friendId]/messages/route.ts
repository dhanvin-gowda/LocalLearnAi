import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getMessages, sendMessage, markMessagesAsRead } from "@/lib/chat-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { friendId } = await params;
    const messages = getMessages(authUser.userId, friendId);

    // Auto mark messages from friend as read when loading the conversation
    markMessagesAsRead(authUser.userId, friendId);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch messages." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { friendId } = await params;
    const body = await req.json();
    const { text } = body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, error: "Message text is required." },
        { status: 400 }
      );
    }

    const message = sendMessage(authUser.userId, friendId, text.trim());

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send message." },
      { status: 400 }
    );
  }
}
