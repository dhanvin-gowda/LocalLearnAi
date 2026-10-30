import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserById } from "@/lib/chat-store";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = getUserById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        initials: user.initials,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Authentication check failed" },
      { status: 500 }
    );
  }
}
