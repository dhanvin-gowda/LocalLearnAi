import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { searchUsers } from "@/lib/chat-store";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const query = req.nextUrl.searchParams.get("q") || "";
    const results = searchUsers(query, authUser.userId);

    return NextResponse.json({
      success: true,
      users: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to search users" },
      { status: 500 }
    );
  }
}
