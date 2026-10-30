import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { respondFriendRequest } from "@/lib/chat-store";

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { requestId, action } = body || {};

    if (!requestId || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Valid requestId and action ('accept' or 'reject') are required." },
        { status: 400 }
      );
    }

    const result = respondFriendRequest(requestId, authUser.userId, action);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to respond to friend request." },
      { status: 400 }
    );
  }
}
