import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/chat-store";
import { signJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, displayName, password } = body || {};

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }

    const user = createUser(username, displayName || username, password);

    const token = signJwt({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        initials: user.initials,
        avatarColor: user.avatarColor,
      },
    });

    response.cookies.set("chat_token", token, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create user." },
      { status: 400 }
    );
  }
}
