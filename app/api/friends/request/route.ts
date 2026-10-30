import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { sendFriendRequest, getUserByUsername } from "@/lib/chat-store";

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
    let { targetUserId, targetUsername } = body || {};

    if (!targetUserId && targetUsername) {
      const found = getUserByUsername(targetUsername);
      if (found) targetUserId = found.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Target user ID or username is required." },
        { status: 400 }
      );
    }

    const request = sendFriendRequest(authUser.userId, targetUserId);

    return NextResponse.json({
      success: true,
      request,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send friend request." },
      { status: 400 }
    );
  }
}
