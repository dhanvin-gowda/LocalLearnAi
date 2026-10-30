import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { FALLBACK_CHALLENGES } from "@/lib/challenges";

export async function GET() {
  // 1. Try forwarding to Python FastAPI backend
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const backendRes = await fetch(`${backendUrl}/challenges`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {}

  // 2. Read directly from backend data file
  try {
    const primaryPath = path.join(process.cwd(), "backend", "data", "challenges.json");
    const secondaryPath = path.join(process.cwd(), "backend", "app", "data", "challenges.json");
    const targetFile = fs.existsSync(primaryPath)
      ? primaryPath
      : fs.existsSync(secondaryPath)
      ? secondaryPath
      : null;

    if (targetFile) {
      const raw = fs.readFileSync(targetFile, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return NextResponse.json(list);
      }
    }
  } catch (err) {}

  return NextResponse.json(FALLBACK_CHALLENGES);
}
