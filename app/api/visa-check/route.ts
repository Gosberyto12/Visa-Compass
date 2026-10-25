import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/rate-limit";
import { runVisaCheck } from "@/lib/visa-provider";
import { parseVisaCheckInput } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string
) {
  return NextResponse.json(
    { error: { code, message, requestId } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const clientKey =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown-client";
  if (!allowRequest(clientKey.length <= 128 ? clientKey : "unknown-client")) {
    return errorResponse(
      requestId,
      429,
      "RATE_LIMITED",
      "Too many requests. Please wait a minute and try again."
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse(requestId, 413, "REQUEST_TOO_LARGE", "Request body exceeds the allowed size.");
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return errorResponse(requestId, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return errorResponse(requestId, 413, "REQUEST_TOO_LARGE", "Request body exceeds the allowed size.");
    }
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(requestId, 400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const input = parseVisaCheckInput(body);
  if (!input) {
    return errorResponse(
      requestId,
      400,
      "INVALID_INPUT",
      "Provide two-letter country codes, a supported travel purpose, valid arrival/departure dates, and a supported passport type."
    );
  }

  try {
    const result = await runVisaCheck(input);
    return NextResponse.json(
      { ...result, requestId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    console.error("Visa check provider request failed.", {
      requestId,
      provider: process.env.VISA_PROVIDER?.toLowerCase() || "mock",
    });
    return errorResponse(
      requestId,
      503,
      "PROVIDER_UNAVAILABLE",
      "Visa information is temporarily unavailable. Confirm requirements with the destination's official immigration authority."
    );
  }
}
