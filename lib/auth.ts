import crypto from "crypto";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "locallearn-super-secret-jwt-key-2026";

export interface AuthUserPayload {
  userId: string;
  username: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

// Base64URL helpers
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Signs a standard JWT with HMAC-SHA256.
 */
export function signJwt(payload: Omit<AuthUserPayload, "iat" | "exp">, expiresInDays = 7): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthUserPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a JWT token. Returns null if invalid or expired.
 */
export function verifyJwt(token: string): AuthUserPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (expectedSig !== signatureB64) {
      return null;
    }

    const payload: AuthUserPayload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Hash password with scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(":");
    if (!salt || !key) return false;

    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);

    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Extracts and verifies the authenticated user from a NextRequest.
 * Looks in:
 * 1. Authorization: Bearer <token> header
 * 2. ?token=... query parameter (essential for EventSource / SSE)
 * 3. chat_token cookie
 */
export function getAuthUser(req: NextRequest): AuthUserPayload | null {
  // 1. Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const verified = verifyJwt(token);
    if (verified) return verified;
  }

  // 2. Query param (for EventSource)
  const tokenQuery = req.nextUrl.searchParams.get("token");
  if (tokenQuery) {
    const verified = verifyJwt(tokenQuery);
    if (verified) return verified;
  }

  // 3. Cookie
  const cookie = req.cookies.get("chat_token")?.value;
  if (cookie) {
    const verified = verifyJwt(cookie);
    if (verified) return verified;
  }

  return null;
}
