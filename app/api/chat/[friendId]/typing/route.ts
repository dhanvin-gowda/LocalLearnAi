import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { setTyping } from "@/lib/chat-store";

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
    const { isTyping } = body || {};

    setTyping(authUser.userId, friendId, Boolean(isTyping));

    return NextResponse.json({
      success: true,
      isTyping: Boolean(isTyping),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update typing status." },
      { status: 500 }
    );
  }
}
