import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { FALLBACK_CHALLENGES } from "@/lib/challenges";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Try forwarding to Python FastAPI backend
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const backendRes = await fetch(`${backendUrl}/challenges/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (backendRes.status === 404) {
      return NextResponse.json(
        { detail: `Challenge '${id}' not found.` },
        { status: 404 }
      );
    }
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // FastAPI server may not be running, continue to local file
  }

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
      const match = list.find((c: any) => c.id === id);
      if (match) {
        return NextResponse.json(match);
      }
    }
  } catch (fileErr) {
    console.error("Error reading challenges file:", fileErr);
  }

  // 3. Fallback to in-memory challenge dataset
  const match = FALLBACK_CHALLENGES.find((c) => c.id === id);
  if (match) {
    return NextResponse.json(match);
  }

  // 404 if not found anywhere
  return NextResponse.json(
    { detail: `Challenge '${id}' not found.` },
    { status: 404 }
  );
}
