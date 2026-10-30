import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getFriendsForUser, getPendingRequestsForUser } from "@/lib/chat-store";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const friends = getFriendsForUser(authUser.userId);
    const requests = getPendingRequestsForUser(authUser.userId);

    return NextResponse.json({
      success: true,
      friends,
      requests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch friends." },
      { status: 500 }
    );
  }
}
