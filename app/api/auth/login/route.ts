import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/chat-store";
import { signJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const user = authenticateUser(username, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

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
      { success: false, error: err.message || "Login failed." },
      { status: 500 }
    );
  }
}
