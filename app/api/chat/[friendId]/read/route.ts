import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { markMessagesAsRead } from "@/lib/chat-store";

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
    const markedCount = markMessagesAsRead(authUser.userId, friendId);

    return NextResponse.json({
      success: true,
      markedCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to mark messages as read." },
      { status: 500 }
    );
  }
}
